import type { PortalCalendarEvent } from './portalEvents.ts'

const defaultEventDurationMs = 60 * 60 * 1_000

export interface CalendarEventProjection {
  title: string
  description?: string
  location?: string
  url?: string
  start: string
  end: string
}

/** Projects one Portal event into metadata shared by iCalendar and Google Calendar. */
export const projectCalendarEvent = (
  item: PortalCalendarEvent,
  prefixCommunity = false,
): CalendarEventProjection => {
  const event = item.event
  const venue = event.osm_name?.trim()
  const address = event.osm_address?.trim()
  const location = venue && address && venue !== address
    ? `${venue}, ${address}`
    : venue || address || event.location
  const tags = event.tags.flatMap(tag => typeof tag.name === 'string' && tag.name.trim() ? [tag.name.trim()] : [])
  const description = [tags.length ? `[${tags.join('] [')}]` : '', event.description ?? '']
    .filter(Boolean)
    .join('\n\n')

  return {
    title: prefixCommunity ? `${item.community.title} - ${event.title}` : event.title,
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
    ...(event.safeLink ? { url: event.safeLink } : {}),
    start: event.start,
    end: event.end ?? new Date(Date.parse(event.start) + defaultEventDurationMs).toISOString(),
  }
}
