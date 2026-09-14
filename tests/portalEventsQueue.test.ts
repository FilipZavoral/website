import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePortalEventsQueueBatch, parsePortalEventsQueueMessage } from '../server/utils/portalEventsQueue.ts'

test('Portal queue messages retain authoritative ordering and delivery metadata', () => {
  assert.deepEqual(parsePortalEventsQueueMessage({
    kind: 'portal-change',
    deliveryId: 'delivery-42',
    resource: 'meetup-event',
    action: 'deleted',
    meetupId: 360,
    eventId: '42',
    sequence: 90598,
    occurredAt: '2026-09-04T08:02:44+00:00',
  }), {
    kind: 'portal-change',
    deliveryId: 'delivery-42',
    resource: 'meetup-event',
    action: 'deleted',
    meetupId: 360,
    eventId: '42',
    sequence: 90598,
    occurredAt: '2026-09-04T08:02:44+00:00',
  })
  assert.deepEqual(parsePortalEventsQueueMessage({ kind: 'refresh-all' }), { kind: 'refresh-all' })
})

test('Portal queue rejects malformed messages before external work starts', () => {
  for (const value of [null, {}, {
    kind: 'portal-change',
    deliveryId: '',
  }, {
    kind: 'portal-change',
    deliveryId: 'delivery-1',
    resource: 'meetup-event',
    action: 'deleted',
    meetupId: 360,
    sequence: 1,
    occurredAt: '2026-09-04T08:02:44+00:00',
  }]) {
    assert.throws(() => parsePortalEventsQueueMessage(value))
  }
})

test('Portal queue acknowledges malformed messages without discarding valid messages', () => {
  const acknowledged: string[] = []
  const envelope = (id: string, body: unknown) => ({
    id,
    body,
    ack: () => { acknowledged.push(id) },
  })
  const result = parsePortalEventsQueueBatch([
    envelope('invalid', { kind: 'portal-change' }),
    envelope('valid', { kind: 'refresh-all' }),
  ])

  assert.deepEqual(result, {
    messages: [{ kind: 'refresh-all' }],
    invalidMessageIds: ['invalid'],
  })
  assert.deepEqual(acknowledged, ['invalid'])
})
