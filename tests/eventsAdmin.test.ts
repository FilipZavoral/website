import assert from 'node:assert/strict'
import test from 'node:test'
import { isEventsAdminTokenValid } from '../server/utils/eventsAdminAuth.ts'
import { clearPortalEventCache, type PortalCacheStorage, type PortalCommunity } from '../server/utils/portalEvents.ts'

test('events admin authentication treats missing configuration like an incorrect query token', () => {
  assert.equal(isEventsAdminTokenValid(undefined, 'secret'), false)
  assert.equal(isEventsAdminTokenValid('secret', undefined), false)
  assert.equal(isEventsAdminTokenValid('secret', ['secret']), false)
  assert.equal(isEventsAdminTokenValid('secret', 'incorrect'), false)
  assert.equal(isEventsAdminTokenValid('secret', 'secret'), true)
})

test('cache clearing removes only the selected community key', async () => {
  const removed: string[] = []
  const storage: PortalCacheStorage = {
    getItem: async () => undefined,
    setItem: async () => {},
    removeItem: async key => { removed.push(key) },
  }
  const community: PortalCommunity = { id: 'brno', path: '/brno', title: 'Brno', portalMeetupId: 360 }
  await clearPortalEventCache(community, storage)
  assert.deepEqual(removed, ['portal:360:events'])
})
