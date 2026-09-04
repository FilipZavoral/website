import { createError, defineEventHandler, getQuery, getRouterParam } from 'h3'
import { getPortalCommunities, type PortalCommunity } from '../../utils/portalEvents.ts'

const portalCalendarOrigin = 'https://portal.einundzwanzig.space'
const publicSlugPattern = /^[a-z0-9][a-z0-9-]*$/

export interface PublicCalendarDependencies {
  communities: () => Promise<readonly PortalCommunity[]>
  fetch: (url: string, init?: RequestInit) => Promise<Response>
}

/** Represents a public-safe iCalendar route failure. */
export class PublicCalendarError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}

/** Rejects every public request shape except one configured path-derived slug. */
export const assertPublicCalendarRequest = (slug: string | undefined, query: Record<string, unknown> = {}) => {
  if (Object.keys(query).length > 0 || !slug || !publicSlugPattern.test(slug) || /^\d+$/.test(slug)) {
    throw new PublicCalendarError(400, 'Neplatná adresa kalendáře.')
  }
}

/** Resolves one configured slug to an inline, byte-preserving Portal calendar response. */
export const getPublicCalendarFeed = async (
  slug: string | undefined,
  dependencies: PublicCalendarDependencies,
  asPlainText = false,
): Promise<Response> => {
  assertPublicCalendarRequest(slug)

  const community = (await dependencies.communities()).find(item => item.id === slug)
  if (!community) throw new PublicCalendarError(404, 'Kalendář komunity nebyl nalezen.')

  const upstreamUrl = `${portalCalendarOrigin}/stream-calendar?meetup=${community.portalMeetupId}`
  let upstream: Response
  try {
    upstream = await dependencies.fetch(upstreamUrl)
  } catch {
    throw new PublicCalendarError(503, 'Kalendář je nyní nedostupný.')
  }

  if (!upstream.ok) throw new PublicCalendarError(502, 'Kalendář je nyní nedostupný.')

  const bytes = await upstream.arrayBuffer()
  if (new TextDecoder().decode(bytes).includes(String(community.portalMeetupId))) {
    throw new PublicCalendarError(502, 'Kalendář je nyní nedostupný.')
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      'content-type': asPlainText ? 'text/plain; charset=utf-8' : 'text/calendar; charset=utf-8',
      'content-disposition': 'inline',
      'vary': 'Sec-Fetch-Dest',
      'x-content-type-options': 'nosniff',
    },
  })
}

export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug')
    assertPublicCalendarRequest(slug, getQuery(event))
    return await getPublicCalendarFeed(slug, {
      communities: () => getPortalCommunities(event),
      fetch,
    }, getHeader(event, 'sec-fetch-dest') === 'document')
  } catch (error) {
    const statusCode = error instanceof PublicCalendarError ? error.statusCode : 503
    const statusMessage = error instanceof PublicCalendarError
      ? error.message
      : 'Kalendář je nyní nedostupný.'
    throw createError({ statusCode, statusMessage })
  }
})
