import type { H3Event } from 'h3'
import type { PortalEvent } from '../../shared/types/portalEvents.ts'

/**
 * Provides the server-only Portal integration: validation, normalization, durable caching, and refreshes.
 * Keeping raw Portal data here prevents unvalidated upstream fields from reaching browser clients.
 */
const portalEventsUrl = 'https://portal.einundzwanzig.space/api/meetup-events?locale=cs'
const portalMeetupsUrl = 'https://portal.einundzwanzig.space/api/meetups'
const maxCacheAgeMs = 7 * 24 * 60 * 60 * 1_000
const cancellationRetentionMs = 90 * 24 * 60 * 60 * 1_000
const cacheSchemaVersion = 1
const wallClockPattern = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/

export interface PortalCommunity {
  id: string
  path: string
  title: string
  portalMeetupId: number
}

export interface PortalStorage {
  getItem(key: string): Promise<unknown>
  setItem(key: string, value: unknown): Promise<void>
}

export type PortalFetch = (url: string, options: { timeout: number, retry: number }) => Promise<unknown>

/** Carries a safe HTTP status code for expected Portal integration failures. */
export class PortalEventsError extends Error {
  readonly statusCode: number

  /** Creates an error whose status code can be forwarded by the API handler. */
  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
  }
}

/** Returns the durable cache key owned by one Portal meetup. */
export const portalEventCacheKey = (portalMeetupId: number) => `portal:${portalMeetupId}:events`

/** Narrows untrusted Portal and cache payload values to non-array objects. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Parses Portal's UTC wall-clock format and rejects impossible calendar values. */
const parseUtcWallClock = (value: unknown, field: string) => {
  if (typeof value !== 'string') throw new PortalEventsError(`Portal event ${field} is invalid`, 502)
  const match = wallClockPattern.exec(value)
  if (!match) throw new PortalEventsError(`Portal event ${field} is invalid`, 502)
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [number, number, number, number, number]
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute))
  if (instant.getUTCFullYear() !== year || instant.getUTCMonth() !== month - 1 || instant.getUTCDate() !== day
    || instant.getUTCHours() !== hour || instant.getUTCMinutes() !== minute) {
    throw new PortalEventsError(`Portal event ${field} is invalid`, 502)
  }
  return instant.toISOString()
}

/** Returns a raw Portal link only when it is safe for the calendar to navigate to. */
const parseLink = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') return undefined
  try {
    const protocol = new URL(value).protocol
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(protocol) ? value : undefined
  } catch {
    return undefined
  }
}

/** Returns non-blank upstream text while discarding missing or invalid optional metadata. */
const parseOptionalText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value : undefined

/** Returns a numeric coordinate in its original decimal form only when it is within geographic bounds. */
const parseCoordinate = (value: unknown, minimum: number, maximum: number): string | undefined => {
  const coordinate = parseOptionalText(value)
  if (!coordinate) return undefined
  const numeric = Number(coordinate)
  return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? coordinate : undefined
}

/** Removes server-only meetup metadata and optional fields that are normalized below. */
const withoutMeetupMetadata = (event: Record<string, unknown>) => Object.fromEntries(
  Object.entries(event).filter(([key]) => key !== 'meetup' && key !== 'meetup_id' && key !== 'community'
    && key !== 'link' && key !== 'safeLink' && key !== 'location' && key !== 'description' && key !== 'image'
    && !['osm_type', 'osm_id', 'osm_name', 'osm_address', 'osm_lat', 'osm_lon'].includes(key)
    && !key.startsWith('meetup.')),
)

/** Retains complete Portal tag objects while rejecting malformed non-object array entries. */
const parseTags = (value: unknown): Record<string, unknown>[] => Array.isArray(value)
  ? value.filter(isRecord)
  : []

/** Preserves one complete raw Portal event while normalizing calendar-critical fields. */
const parseEvent = (value: unknown): PortalEvent => {
  if (!isRecord(value) || !Number.isSafeInteger(value.id) || (value.id as number) < 0) {
    throw new PortalEventsError('Portal event row is invalid', 502)
  }
  const title = typeof value.title === 'string' && value.title.trim()
    ? value.title
    : typeof value['meetup.name'] === 'string' && value['meetup.name'].trim()
      ? value['meetup.name']
      : null
  if (!title) throw new PortalEventsError('Portal event title is invalid', 502)
  const link = typeof value.link === 'string' ? value.link : undefined
  const safeLink = parseLink(link)
  const location = parseOptionalText(value.location)
  const osmType = parseOptionalText(value.osm_type)
  const osmId = Number.isSafeInteger(value.osm_id) && (value.osm_id as number) >= 0 ? value.osm_id as number : undefined
  const osmName = parseOptionalText(value.osm_name)
  const osmAddress = parseOptionalText(value.osm_address)
  const osmLat = parseCoordinate(value.osm_lat, -90, 90)
  const osmLon = parseCoordinate(value.osm_lon, -180, 180)
  const description = parseOptionalText(value.description)
  const image = parseLink(value['meetup.logo'])
  return {
    ...withoutMeetupMetadata(value),
    id: String(value.id),
    title,
    start: parseUtcWallClock(value.start, 'start'),
    end: value.end === null ? null : parseUtcWallClock(value.end, 'end'),
    ...(link !== undefined ? { link } : {}),
    ...(safeLink ? { safeLink } : {}),
    ...(location ? { location } : {}),
    ...(osmType ? { osm_type: osmType } : {}),
    ...(osmId !== undefined ? { osm_id: osmId } : {}),
    ...(osmName ? { osm_name: osmName } : {}),
    ...(osmAddress ? { osm_address: osmAddress } : {}),
    ...(osmLat ? { osm_lat: osmLat } : {}),
    ...(osmLon ? { osm_lon: osmLon } : {}),
    ...(description ? { description } : {}),
    ...(image?.startsWith('http') ? { image } : {}),
    tags: parseTags(value.tags),
  }
}

interface CachedEvent {
  event: PortalEvent
  fingerprint: string
  sequence: number
  changedAt: string
}

interface CancelledEvent extends CachedEvent {
  cancelledAt: string
}

interface CachedEvents {
  schemaVersion: typeof cacheSchemaVersion
  events: CachedEvent[]
  cancellations: CancelledEvent[]
  fetchedAt: string
  validatedFromNonEmptySource: true
}

export interface PortalCalendarEvent {
  event: PortalEvent
  sequence: number
  changedAt: string
  cancelled: boolean
  community: PortalCommunity
}

/** Validates a cached event before reuse so old or corrupted cache entries force a fresh fetch. */
const isPortalEvent = (value: unknown): value is PortalEvent => isRecord(value)
  && typeof value.id === 'string'
  && typeof value.title === 'string'
  && typeof value.start === 'string'
  && !Number.isNaN(Date.parse(value.start))
  && (value.end === null || (typeof value.end === 'string' && !Number.isNaN(Date.parse(value.end))))
  && (value.link === undefined || typeof value.link === 'string')
  && (value.safeLink === undefined || typeof value.safeLink === 'string')
  && (value.location === undefined || typeof value.location === 'string')
  && (value.osm_type === undefined || typeof value.osm_type === 'string')
  && (value.osm_id === undefined || (typeof value.osm_id === 'number' && Number.isSafeInteger(value.osm_id) && value.osm_id >= 0))
  && (value.osm_name === undefined || typeof value.osm_name === 'string')
  && (value.osm_address === undefined || typeof value.osm_address === 'string')
  && (value.osm_lat === undefined || parseCoordinate(value.osm_lat, -90, 90) === value.osm_lat)
  && (value.osm_lon === undefined || parseCoordinate(value.osm_lon, -180, 180) === value.osm_lon)
  && (value.description === undefined || typeof value.description === 'string')
  && (value.image === undefined || (typeof value.image === 'string' && /^https?:\/\//.test(value.image)))
  && Array.isArray(value.tags)
  && value.tags.every(isRecord)
  && !Object.keys(value).some(key => key === 'meetup' || key === 'meetup_id' || key === 'community' || key.startsWith('meetup.'))

const isCachedEvent = (value: unknown): value is CachedEvent => isRecord(value)
  && isPortalEvent(value.event)
  && typeof value.fingerprint === 'string'
  && Number.isSafeInteger(value.sequence)
  && typeof value.changedAt === 'string'
  && !Number.isNaN(Date.parse(value.changedAt))

const isCancelledEvent = (value: unknown): value is CancelledEvent => isCachedEvent(value)
  && 'cancelledAt' in value
  && typeof value.cancelledAt === 'string'
  && !Number.isNaN(Date.parse(value.cancelledAt))

/** Validates one current-version storage value, returning null when it must be refreshed. */
const parseCache = (value: unknown): CachedEvents | null => {
  if (value === null || value === undefined) return null
  if (!isRecord(value) || value.schemaVersion !== cacheSchemaVersion
    || !Array.isArray(value.events) || !value.events.every(isCachedEvent)
    || !Array.isArray(value.cancellations) || !value.cancellations.every(isCancelledEvent)
    || (value.events.length === 0 && value.validatedFromNonEmptySource !== true)
    || typeof value.fetchedAt !== 'string' || Number.isNaN(Date.parse(value.fetchedAt))) return null
  return {
    schemaVersion: cacheSchemaVersion,
    events: value.events,
    cancellations: value.cancellations,
    fetchedAt: new Date(value.fetchedAt).toISOString(),
    validatedFromNonEmptySource: true,
  }
}

/** Filters completed events and returns a stable chronological order for cache and response use. */
const futureEvents = (events: readonly PortalEvent[], now: Date) => events
  .filter(event => Date.parse(event.end ?? event.start) >= now.getTime())
  .slice()
  .sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || Number(a.id) - Number(b.id))

const eventFingerprint = (event: PortalEvent) => JSON.stringify({
  title: event.title,
  start: event.start,
  end: event.end,
  description: event.description,
  location: event.location,
  osm_name: event.osm_name,
  osm_address: event.osm_address,
  safeLink: event.safeLink,
  image: event.image,
  tags: event.tags,
})

const nextRevision = (event: PortalEvent, previous: CachedEvent | undefined, now: Date): CachedEvent => {
  const fingerprint = eventFingerprint(event)
  if (previous?.fingerprint === fingerprint) return { ...previous, event }
  return {
    event,
    fingerprint,
    sequence: Math.max(previous ? previous.sequence + 1 : 0, Math.floor(now.getTime() / 1_000)),
    changedAt: now.toISOString(),
  }
}

/** Fetches one Portal endpoint with bounded retries and translates transport failures to a safe error. */
const fetchPayload = async (fetcher: PortalFetch, url: string) => {
  try {
    return await fetcher(url, { timeout: 5_000, retry: 0 })
  } catch {
    throw new PortalEventsError('Portal event refresh failed', 502)
  }
}

/** Fetches Portal's current data and atomically replaces cache entries for the requested communities. */
export const refreshPortalMeetups = async (
  communities: readonly PortalCommunity[],
  storage: PortalStorage,
  fetcher: PortalFetch,
  now = new Date(),
) => {
  const [eventPayload, meetupPayload] = await Promise.all([
    fetchPayload(fetcher, portalEventsUrl),
    fetchPayload(fetcher, portalMeetupsUrl),
  ])
  if (!Array.isArray(eventPayload) || !Array.isArray(meetupPayload)) {
    throw new PortalEventsError('Portal response is invalid', 502)
  }
  if (eventPayload.length === 0) throw new PortalEventsError('Portal event response is empty', 502)
  const linkByMeetup = new Map<number, string>()
  for (const community of communities) {
    const meetup = meetupPayload.find(row => isRecord(row) && row.id === community.portalMeetupId)
    if (!isRecord(meetup) || typeof meetup.portalLink !== 'string') {
      throw new PortalEventsError(`Configured Portal meetup ${community.portalMeetupId} was not found`, 502)
    }
    linkByMeetup.set(community.portalMeetupId, meetup.portalLink)
  }

  await Promise.all(communities.map(async (community) => {
    const portalLink = linkByMeetup.get(community.portalMeetupId)
    const events = futureEvents(eventPayload
      .filter(row => isRecord(row) && row['meetup.portalLink'] === portalLink)
      .map(parseEvent), now)
    const previous = parseCache(await storage.getItem(portalEventCacheKey(community.portalMeetupId)))
    const previousEvents = new Map(previous?.events.map(item => [item.event.id, item]))
    const cache: CachedEvents = {
      schemaVersion: cacheSchemaVersion,
      events: events.map(event => nextRevision(event, previousEvents.get(event.id), now)),
      cancellations: (previous?.cancellations ?? [])
        .filter(item => now.getTime() - Date.parse(item.cancelledAt) < cancellationRetentionMs),
      fetchedAt: now.toISOString(),
      validatedFromNonEmptySource: true,
    }
    await storage.setItem(portalEventCacheKey(community.portalMeetupId), cache)
  }))
}

/** Moves one webhook-confirmed deletion into the calendar cancellation window. */
export const markPortalEventCancelled = async (
  community: PortalCommunity,
  eventId: string,
  storage: PortalStorage,
  now = new Date(),
) => {
  const key = portalEventCacheKey(community.portalMeetupId)
  const cache = parseCache(await storage.getItem(key))
  if (!cache) return
  const active = cache.events.find(item => item.event.id === eventId)
  if (!active) return
  const sequence = Math.max(active.sequence + 1, Math.floor(now.getTime() / 1_000))
  await storage.setItem(key, {
    ...cache,
    events: cache.events.filter(item => item.event.id !== eventId),
    cancellations: [
      ...cache.cancellations.filter(item => item.event.id !== eventId),
      { ...active, sequence, changedAt: now.toISOString(), cancelledAt: now.toISOString() },
    ],
  } satisfies CachedEvents)
}

const getPortalCaches = async (
  selected: readonly PortalCommunity[],
  storage: PortalStorage,
  fetcher: PortalFetch,
  now: Date,
) => {
  let caches = await Promise.all(selected.map(async community => ({
    community,
    cache: parseCache(await storage.getItem(portalEventCacheKey(community.portalMeetupId))),
  })))
  const needsRefresh = caches.some(({ cache }) => !cache || now.getTime() - Date.parse(cache.fetchedAt) >= maxCacheAgeMs)
  if (needsRefresh) {
    try {
      await refreshPortalMeetups(selected, storage, fetcher, now)
      caches = await Promise.all(selected.map(async community => ({
        community,
        cache: parseCache(await storage.getItem(portalEventCacheKey(community.portalMeetupId))),
      })))
    } catch (error) {
      if (caches.some(({ cache }) => !cache)) throw error
    }
  }
  return caches.map(({ community, cache }) => {
    if (!cache) throw new PortalEventsError(`Cache for ${community.id} is unavailable`, 502)
    return { community, cache }
  })
}

/** Returns fresh-enough future events, refreshing stale or missing community cache entries when necessary. */
export const getPortalEvents = async (
  requested: string,
  communities: readonly PortalCommunity[],
  storage: PortalStorage,
  fetcher: PortalFetch,
  now = new Date(),
): Promise<PortalEvent[]> => {
  const selected = requested === 'all'
    ? communities
    : communities.filter(community => community.id === requested)
  if (selected.length === 0) throw new PortalEventsError('Community was not found', 404)

  const caches = await getPortalCaches(selected, storage, fetcher, now)
  return caches.flatMap(({ community, cache }) => futureEvents(cache.events.map(item => item.event), now).map(event => requested === 'all'
    ? { ...event, community: { path: community.path, name: community.title } }
    : event)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || Number(a.id) - Number(b.id))
}

/** Returns active and recently cancelled events for one generated calendar scope. */
export const getPortalCalendarEvents = async (
  requested: readonly string[] | 'all',
  communities: readonly PortalCommunity[],
  storage: PortalStorage,
  fetcher: PortalFetch,
  now = new Date(),
): Promise<PortalCalendarEvent[]> => {
  const selected = requested === 'all'
    ? communities
    : communities.filter(community => requested.includes(community.id))
  if (selected.length === 0 || (requested !== 'all' && selected.length !== requested.length)) {
    throw new PortalEventsError('Community was not found', 404)
  }
  const caches = await getPortalCaches(selected, storage, fetcher, now)
  return caches.flatMap(({ community, cache }) => [
    ...cache.events.map(item => ({ ...item, cancelled: false, community })),
    ...cache.cancellations
      .filter(item => now.getTime() - Date.parse(item.cancelledAt) < cancellationRetentionMs)
      .map(item => ({ ...item, cancelled: true, community })),
  ])
}

/** Reads content-owned community settings and projects only valid Portal integration configuration. */
export const getPortalCommunities = async (event: H3Event): Promise<PortalCommunity[]> => {
  const { queryCollection } = await import('@nuxt/content/server')
  const communities = await queryCollection(event, 'communities').all()
  return communities.flatMap((community) => {
    if (community.portal_meetup_id === undefined || community.portal_meetup_id === null) return []
    const portalMeetupId = Number(community.portal_meetup_id)
    if (!Number.isSafeInteger(portalMeetupId) || portalMeetupId < 0) {
      throw new Error(`Community ${community.path} has an invalid Portal meetup ID`)
    }
    return [{
      id: community.path.replace(/^\/+/, ''),
      path: community.path,
      title: community.title,
      portalMeetupId,
    }]
  })
}
