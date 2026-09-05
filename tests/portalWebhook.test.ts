import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createPortalWebhookSignature,
  getPortalWebhookEventId,
  getPortalWebhookMeetupId,
  isPortalWebhookSignatureValid,
} from '../server/api/events/webhook.post.ts'

test('Portal webhook signature is lowercase HMAC-SHA256 over timestamp dot raw body', async () => {
  const timestamp = '1788177600'
  const body = '{"action":"updated","resource":"meetup-event","data":{"meetup_id":360}}'
  assert.equal(
    await createPortalWebhookSignature('secret', timestamp, body),
    '890c3d1d91bb5ec369d58b50b74976335e51ba26f30d468896eab191f85675bf',
  )
})

test('Portal webhook verification rejects tampering and timestamps outside the five-minute replay window', async () => {
  const body = '{"action":"updated","resource":"meetup-event","data":{"meetup_id":360}}'
  const timestamp = '1788177600'
  const signature = await createPortalWebhookSignature('secret', timestamp, body)
  assert.equal(await isPortalWebhookSignatureValid('secret', timestamp, body, signature, 1788177600), true)
  assert.equal(await isPortalWebhookSignatureValid('secret', timestamp, `${body} `, signature, 1788177600), false)
  assert.equal(await isPortalWebhookSignatureValid('secret', timestamp, body, signature, 1788177901), false)
})

test('meetup IDs resolve from current objects and deletion tombstones', () => {
  assert.equal(getPortalWebhookMeetupId({ resource: 'meetup-event', data: { meetup_id: 360 } }), 360)
  assert.equal(getPortalWebhookMeetupId({ resource: 'meetup-event', data: null, previous: { meetup_id: 360 } }), 360)
  assert.equal(getPortalWebhookMeetupId({ resource: 'meetup', data: { id: 360 } }), 360)
  assert.equal(getPortalWebhookMeetupId({ resource: 'meetup-event', data: {} }), null)
})

test('event IDs resolve from current objects and deletion tombstones', () => {
  assert.equal(getPortalWebhookEventId({ resource: 'meetup-event', data: { id: 42 } }), '42')
  assert.equal(getPortalWebhookEventId({ resource: 'meetup-event', data: null, previous: { id: 43 } }), '43')
  assert.equal(getPortalWebhookEventId({ resource: 'meetup', data: { id: 42 } }), null)
})
