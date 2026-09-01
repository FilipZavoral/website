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

/** Resolves one configured slug to an inline, byte-preserving Portal calendar response. */
export const getPublicCalendarFeed = async (
  slug: string | undefined,
  dependencies: PublicCalendarDependencies,
): Promise<Response> => {
  if (!slug || !publicSlugPattern.test(slug)) {
    throw new PublicCalendarError(400, 'Neplatná adresa kalendáře.')
  }

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
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline',
    },
  })
}

export default defineEventHandler(async (event) => {
  if (Object.keys(getQuery(event)).length > 0) {
    throw createError({ statusCode: 400, statusMessage: 'Parametry nejsou povoleny.' })
  }

  try {
    return await getPublicCalendarFeed(getRouterParam(event, 'slug'), {
      communities: () => getPortalCommunities(event),
      fetch,
    })
  } catch (error) {
    const statusCode = error instanceof PublicCalendarError ? error.statusCode : 503
    const statusMessage = error instanceof PublicCalendarError
      ? error.message
      : 'Kalendář je nyní nedostupný.'
    throw createError({ statusCode, statusMessage })
  }
})
