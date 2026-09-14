import { createError, defineEventHandler, getQuery } from 'h3'
import { getPortalEvents, PortalEventsError } from '../../utils/portalEvents.ts'

/**
 * Serves normalized public events for one configured community or the all-communities calendar.
 * The handler validates the request before reading the durable community snapshots.
 */
export default defineEventHandler(async (event) => {
  const community = getQuery(event).community
  if (typeof community !== 'string' || !/^(?:all|[a-z0-9][a-z0-9-]*)$/i.test(community)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid community is required' })
  }
  try {
    return await getPortalEvents(
      community,
      useStorage('portalEvents'),
    )
  } catch (error) {
    console.error('Portal event request failed', error)
    const statusCode = error instanceof PortalEventsError ? error.statusCode : 503
    throw createError({
      statusCode,
      statusMessage: statusCode === 404
        ? 'Community was not found'
        : import.meta.dev && error instanceof Error
          ? error.message
          : 'Portal events are unavailable',
    })
  }
})
