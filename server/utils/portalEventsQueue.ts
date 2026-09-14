import type { PortalChangeAction } from './portalEvents.ts'

export const portalEventsQueueName = 'portal-events'

export interface PortalEventsQueue {
  send(message: PortalEventsQueueMessage): Promise<unknown>
}

export interface PortalEventsQueueEnvelope {
  id: string
  body: unknown
  ack(): void
}

export type PortalEventsQueueMessage = {
  kind: 'refresh-all'
} | {
  kind: 'portal-change'
  deliveryId: string
  resource: 'meetup' | 'meetup-event'
  action: PortalChangeAction
  meetupId: number
  eventId?: string
  sequence: number
  occurredAt: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parsePortalEventsQueueMessage = (value: unknown): PortalEventsQueueMessage => {
  if (!isRecord(value)) throw new Error('Portal events queue message must be an object')
  if (value.kind === 'refresh-all') return { kind: 'refresh-all' }
  if (value.kind !== 'portal-change'
    || typeof value.deliveryId !== 'string' || !value.deliveryId
    || !['meetup', 'meetup-event'].includes(String(value.resource))
    || !['created', 'updated', 'deleted'].includes(String(value.action))
    || !Number.isSafeInteger(value.meetupId) || (value.meetupId as number) < 0
    || (value.eventId !== undefined && (typeof value.eventId !== 'string' || !/^\d+$/.test(value.eventId)))
    || (value.resource === 'meetup-event' && value.eventId === undefined)
    || !Number.isSafeInteger(value.sequence) || (value.sequence as number) < 0
    || typeof value.occurredAt !== 'string' || Number.isNaN(Date.parse(value.occurredAt))) {
    throw new Error('Portal events queue message is invalid')
  }
  return value as unknown as PortalEventsQueueMessage
}

export const parsePortalEventsQueueBatch = (messages: readonly PortalEventsQueueEnvelope[]) => {
  const parsed: PortalEventsQueueMessage[] = []
  const invalidMessageIds: string[] = []
  for (const message of messages) {
    try {
      parsed.push(parsePortalEventsQueueMessage(message.body))
    } catch {
      message.ack()
      invalidMessageIds.push(message.id)
    }
  }
  return { messages: parsed, invalidMessageIds }
}
