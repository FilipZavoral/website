/**
 * Projects normalized Portal events into Czech-local display rows and Event JSON-LD.
 * Keeping timezone conversion here gives the calendar UI and structured data one source of truth.
 */
import type { PortalEvent } from '#shared/types/portalEvents'

export type CalendarEventRow = PortalEvent & {
  weekdayLabel: string
  dateLabel: string
  startTime: string
  endTime: string | null
  tagNames: string[]
  osmMapUri?: string
}

const weekdayLabel = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  weekday: 'short',
})

const dateLabel = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  dateStyle: 'long',
})

const timeLabel = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  hour: '2-digit',
  minute: '2-digit',
})

const offsetParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Prague',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
  timeZoneName: 'longOffset',
})

/** Converts Intl format parts into a named record for building an offset ISO timestamp. */
const partsRecord = (formatter: Intl.DateTimeFormat, instant: Date) =>
  Object.fromEntries(formatter.formatToParts(instant).map(part => [part.type, part.value]))

/** Orders simultaneous events by their stable numeric Portal ID after their start instant. */
const byStartThenId = (a: PortalEvent, b: PortalEvent) =>
  Date.parse(a.start) - Date.parse(b.start) || Number(a.id) - Number(b.id)

/** Builds a geo URI that native map applications can use to open an OSM-selected venue. */
export const osmMapUri = (event: Pick<PortalEvent, 'osm_name' | 'osm_lat' | 'osm_lon'>): string | undefined => {
  if (!event.osm_name || !event.osm_lat || !event.osm_lon) return undefined
  const query = `${event.osm_lat},${event.osm_lon}(${event.osm_name})`
  return `geo:${event.osm_lat},${event.osm_lon}?q=${encodeURIComponent(query)}`
}

/** Adds Czech-local date and time labels without mutating the API event array. */
export const projectCalendarEvents = (events: readonly PortalEvent[]): CalendarEventRow[] =>
  events.slice().sort(byStartThenId).map((event) => {
    const instant = new Date(event.start)
    const mapUri = osmMapUri(event)
    return {
      ...event,
      weekdayLabel: weekdayLabel.format(instant).slice(0, 2),
      dateLabel: dateLabel.format(instant),
      startTime: timeLabel.format(instant),
      endTime: event.end ? timeLabel.format(new Date(event.end)) : null,
      tagNames: event.tags.flatMap(tag => typeof tag.name === 'string' && tag.name.trim() ? [tag.name] : []),
      ...(mapUri ? { osmMapUri: mapUri } : {}),
    }
  })

/** Formats a UTC instant as an ISO timestamp with the correct Europe/Prague seasonal offset. */
const toPragueIsoOffset = (instant: string) => {
  const parts = partsRecord(offsetParts, new Date(instant))
  const offset = parts.timeZoneName === 'GMT' ? 'Z' : parts.timeZoneName?.replace('GMT', '')
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`
}

/** Produces XSS-safe schema.org Event JSON-LD for the currently visible Portal events. */
export const eventJsonLd = (events: readonly PortalEvent[]) => JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': events.map(event => ({
    '@type': 'Event',
    name: event.title,
    startDate: toPragueIsoOffset(event.start),
    ...(event.end ? { endDate: toPragueIsoOffset(event.end) } : {}),
    ...(event.safeLink ? { url: event.safeLink } : {}),
    ...(event.description ? { description: event.description } : {}),
    ...(event.location ? { location: event.location } : {}),
    ...(event.community ? {
      organizer: {
        '@type': 'Organization',
        name: event.community.name,
        url: `https://jednadvacet.org${event.community.path}`,
      },
    } : {}),
  })),
}).replaceAll('<', '\\u003c')
