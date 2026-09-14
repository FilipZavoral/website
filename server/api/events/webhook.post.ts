import { createError, defineEventHandler, getHeader, readRawBody, setResponseStatus } from 'h3'
import type { PortalChangeAction } from '../../utils/portalEvents.ts'
import type { PortalEventsQueue } from '../../utils/portalEventsQueue.ts'

/**
 * Receives signed Portal change notifications and queues an authoritative cache refresh.
 * The webhook body is never applied directly to a public snapshot.
 */
const maxTimestampSkewSeconds = 5 * 60
const encoder = new TextEncoder()

/** Narrows unknown JSON values to non-array objects before reading webhook fields. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Encodes Web Crypto signature bytes as the lowercase hexadecimal header format used by Portal. */
const bytesToHex = (bytes: Uint8Array) => [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')

/** Compares same-length signatures without returning early on the first mismatched byte. */
const secureEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

/** Signs an exact raw webhook payload with the configured HMAC secret. */
const signatureFor = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return bytesToHex(new Uint8Array(signature))
}

/** Builds Portal's timestamp-dot-body HMAC payload and returns its signature. */
export const createPortalWebhookSignature = (secret: string, timestamp: string, rawBody: string) =>
  signatureFor(secret, `${timestamp}.${rawBody}`)

/** Rejects replayed, malformed, or incorrectly signed Portal webhook deliveries. */
export const isPortalWebhookSignatureValid = async (
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
  nowSeconds = Math.floor(Date.now() / 1_000),
) => {
  const timestampSeconds = Number(timestamp)
  return Number.isSafeInteger(timestampSeconds)
    && Math.abs(nowSeconds - timestampSeconds) <= maxTimestampSkewSeconds
    && secureEqual(signature, await createPortalWebhookSignature(secret, timestamp, rawBody))
}

/** Extracts the affected meetup ID from current data or deletion tombstone data. */
export const getPortalWebhookMeetupId = (payload: Record<string, unknown>) => {
  if (payload.resource === 'meetup') {
    if (Number.isSafeInteger(payload.id)) return payload.id as number
    if (isRecord(payload.data) && Number.isSafeInteger(payload.data.id)) return payload.data.id as number
    if (isRecord(payload.previous) && Number.isSafeInteger(payload.previous.id)) return payload.previous.id as number
  }
  if (isRecord(payload.data) && Number.isSafeInteger(payload.data.meetup_id)) return payload.data.meetup_id as number
  if (isRecord(payload.previous) && Number.isSafeInteger(payload.previous.meetup_id)) return payload.previous.meetup_id as number
  return null
}

/** Extracts the affected Portal event ID when the webhook addresses an event. */
export const getPortalWebhookEventId = (payload: Record<string, unknown>) => {
  if (payload.resource !== 'meetup-event') return null
  if (Number.isSafeInteger(payload.id)) return String(payload.id)
  if (isRecord(payload.data) && Number.isSafeInteger(payload.data.id)) return String(payload.data.id)
  if (isRecord(payload.previous) && Number.isSafeInteger(payload.previous.id)) return String(payload.previous.id)
  return null
}

/** Validates a Portal webhook envelope and queues its change metadata. */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const secret = config.portalWebhookSecret
  const eventName = getHeader(event, 'x-portal-event')
  const deliveryId = getHeader(event, 'x-portal-delivery')
  const timestamp = getHeader(event, 'x-portal-timestamp')
  const signature = getHeader(event, 'x-portal-signature')
  const rawBody = await readRawBody(event)
  if (!secret || !eventName || !deliveryId || !timestamp || !signature || rawBody === undefined) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Portal webhook' })
  }

  if (!await isPortalWebhookSignatureValid(secret, timestamp, rawBody, signature)) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid Portal webhook' })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Portal webhook payload' })
  }
  if (!isRecord(payload) || !/^(?:meetup|meetup-event)\.(?:created|updated|deleted)$/.test(eventName)
    || `${payload.resource}.${payload.action}` !== eventName) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Portal webhook payload' })
  }
  const meetupId = getPortalWebhookMeetupId(payload)
  const sequence = payload.sequence
  const occurredAt = payload.occurred_at
  const eventId = getPortalWebhookEventId(payload)
  // occurred_at is signed but not bounded against the delivery timestamp. If Portal clock
  // errors ever extend tombstone retention, use server receipt time for retention instead.
  if (meetupId === null || (payload.resource === 'meetup-event' && eventId === null)
    || !Number.isSafeInteger(sequence) || (sequence as number) < 0
    || typeof occurredAt !== 'string' || Number.isNaN(Date.parse(occurredAt))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Portal webhook payload' })
  }

  const platform = event.context._platform as { cloudflare?: { env?: Record<string, unknown> } } | undefined
  const queue = platform?.cloudflare?.env?.PORTAL_EVENTS_QUEUE as PortalEventsQueue | undefined
  if (!queue?.send) throw createError({ statusCode: 503, statusMessage: 'Portal event queue is unavailable' })
  await queue.send({
    kind: 'portal-change',
    deliveryId,
    resource: payload.resource as 'meetup' | 'meetup-event',
    action: payload.action as PortalChangeAction,
    meetupId,
    ...(eventId ? { eventId } : {}),
    sequence: sequence as number,
    occurredAt,
  })
  setResponseStatus(event, 202)
  return { ok: true }
})
