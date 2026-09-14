import assert from 'node:assert/strict'
import test from 'node:test'
import { isEventsAdminTokenValid } from '../server/utils/eventsAdminAuth.ts'

test('events admin authentication treats missing configuration like an incorrect token', () => {
  assert.equal(isEventsAdminTokenValid(undefined, 'secret'), false)
  assert.equal(isEventsAdminTokenValid('secret', undefined), false)
  assert.equal(isEventsAdminTokenValid('secret', ['secret']), false)
  assert.equal(isEventsAdminTokenValid('secret', 'incorrect'), false)
  assert.equal(isEventsAdminTokenValid('secret', 'secret'), true)
})
