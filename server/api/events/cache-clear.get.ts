import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'
import { isEventsAdminTokenValid } from '../../utils/eventsAdminAuth.ts'
import {
  clearPortalEventCache,
  getPortalCommunities,
  type PortalCacheStorage,
} from '../../utils/portalEvents.ts'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const query = getQuery(event)
  const runtimeConfig = useRuntimeConfig(event)
  if (!isEventsAdminTokenValid(runtimeConfig.eventsAdminToken, query.token)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid events admin token' })
  }
  if (Object.keys(query).some(key => key !== 'token' && key !== 'community') || typeof query.community !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid cache clear request' })
  }

  const community = (await getPortalCommunities(event)).find(item => item.id === query.community)
  if (!community) throw createError({ statusCode: 404, statusMessage: 'Community was not found' })
  await clearPortalEventCache(community, useStorage('portalEvents') as PortalCacheStorage)
  return { ok: true, community: community.id }
})
