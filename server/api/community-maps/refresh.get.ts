import { createError, defineEventHandler, getQuery, setResponseHeader } from 'h3'

import { isEventsAdminTokenValid } from '../../utils/eventsAdminAuth.ts'
import type { generateCommunityMaps } from '../../utils/staticMap.ts'

type CommunityMapResult = Awaited<ReturnType<typeof generateCommunityMaps>>

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')
  const query = getQuery(event)
  const runtimeConfig = useRuntimeConfig(event)
  if (!isEventsAdminTokenValid(runtimeConfig.eventsAdminToken, query.token)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid events admin token' })
  }
  if (
    Object.keys(query).some(key => key !== 'token' && key !== 'community')
    || (query.community !== undefined && (
      typeof query.community !== 'string'
      || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query.community)
    ))
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid community map refresh request' })
  }

  const task = await runTask<CommunityMapResult>('community-maps', {
    payload: query.community ? { community: query.community } : {},
  })
  return { ok: true, ...task.result }
})
