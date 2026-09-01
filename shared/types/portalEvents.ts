/**
 * Defines a complete Portal event record shared by server caching and browser rendering.
 * Known fields are normalized for the calendar while every other upstream field remains available.
 */
export interface PortalEventTag extends Record<string, unknown> {
  name?: string
  locale?: string
}

export interface PortalEventCommunity {
  path: string
  name: string
}

export interface PortalEvent extends Record<string, unknown> {
  id: string
  title: string
  start: string
  end: string | null
  link?: string
  safeLink?: string
  location?: string
  description?: string
  tags: PortalEventTag[]
  community?: PortalEventCommunity
}
