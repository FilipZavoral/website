import type { H3Event } from 'h3'
import type { PortalEvent } from '../../shared/types/portalEvents.ts'

/**
 * Provides the server-only Portal integration: validation, normalization, durable caching, and refreshes.
 * Keeping raw Portal data here prevents unvalidated upstream fields from reaching browser clients.
 */
const portalEventsUrl = 'https://portal.einundzwanzig.space/api/meetup-events'
const portalMeetupsUrl = 'https://portal.einundzwanzig.space/api/meetups'
const maxCacheAgeMs = 7 * 24 * 60 * 60 * 1_000
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

/** Returns the durable per-community storage key from its public path. */
export const portalEventCacheKey = (path: string) => `community:${path.replace(/^\/+/, '')}:events`

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

/** Removes Portal meetup metadata, which is only needed while refreshing the server cache. */
const withoutMeetupMetadata = (event: Record<string, unknown>) => Object.fromEntries(
  Object.entries(event).filter(([key]) => key !== 'meetup' && key !== 'meetup_id' && key !== 'community' && !key.startsWith('meetup.')),
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
  const safeLink = parseLink(value.link)
  const location = parseOptionalText(value.location)
  const description = parseOptionalText(value.description)
  return {
    ...withoutMeetupMetadata(value),
    id: String(value.id),
    title,
    start: parseUtcWallClock(value.start, 'start'),
    end: value.end === null ? null : parseUtcWallClock(value.end, 'end'),
    ...(safeLink ? { safeLink } : {}),
    ...(location ? { location } : {}),
    ...(description ? { description } : {}),
    tags: parseTags(value.tags),
  }
}

interface CachedEvents {
  events: PortalEvent[]
  fetchedAt: string
  validatedFromNonEmptySource: true
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
  && (value.description === undefined || typeof value.description === 'string')
  && Array.isArray(value.tags)
  && value.tags.every(isRecord)
  && !Object.keys(value).some(key => key === 'meetup' || key === 'meetup_id' || key === 'community' || key.startsWith('meetup.'))

/** Validates and normalizes one storage value, returning null when it must be refreshed. */
const parseCache = (value: unknown): CachedEvents | null => {
  if (value === null || value === undefined) return null
  if (!isRecord(value) || !Array.isArray(value.events) || !value.events.every(isPortalEvent)
    || (value.events.length === 0 && value.validatedFromNonEmptySource !== true)
    || typeof value.fetchedAt !== 'string' || Number.isNaN(Date.parse(value.fetchedAt))) return null
  return {
    events: value.events,
    fetchedAt: new Date(value.fetchedAt).toISOString(),
    validatedFromNonEmptySource: true,
  }
}

/** Filters completed events and returns a stable chronological order for cache and response use. */
const futureEvents = (events: readonly PortalEvent[], now: Date) => events
  .filter(event => Date.parse(event.end ?? event.start) >= now.getTime())
  .slice()
  .sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || Number(a.id) - Number(b.id))

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
    const events = eventPayload
      .filter(row => isRecord(row) && row['meetup.portalLink'] === portalLink)
      .map(parseEvent)
    const cache: CachedEvents = {
      events: futureEvents(events, now),
      fetchedAt: now.toISOString(),
      validatedFromNonEmptySource: true,
    }
    await storage.setItem(portalEventCacheKey(community.path), cache)
  }))
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

  let caches = await Promise.all(selected.map(async community => ({
    community,
    cache: parseCache(await storage.getItem(portalEventCacheKey(community.path))),
  })))
  const needsRefresh = caches.some(({ cache }) => !cache || now.getTime() - Date.parse(cache.fetchedAt) >= maxCacheAgeMs)
  if (needsRefresh) {
    try {
      await refreshPortalMeetups(requested === 'all' ? communities : selected, storage, fetcher, now)
      caches = await Promise.all(selected.map(async community => ({
        community,
        cache: parseCache(await storage.getItem(portalEventCacheKey(community.path))),
      })))
    } catch (error) {
      if (caches.some(({ cache }) => !cache)) throw error
    }
  }

  return caches.flatMap(({ community, cache }) => futureEvents(cache?.events ?? [], now).map(event => requested === 'all'
    ? { ...event, community: { path: community.path, name: community.title } }
    : event)).sort((a, b) => Date.parse(a.start) - Date.parse(b.start) || Number(a.id) - Number(b.id))
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
