import type { PortalEventsQueue } from '../utils/portalEventsQueue.ts'

interface PortalEventsTaskContext {
  portalEventsQueue?: PortalEventsQueue
  cloudflare?: { env?: Record<string, unknown> }
}

export default defineTask({
  meta: {
    name: 'portal-events',
    description: 'Queue a complete Portal event snapshot refresh',
  },
  async run(event) {
    const context = event.context as PortalEventsTaskContext
    const queue = context.portalEventsQueue
      ?? context.cloudflare?.env?.PORTAL_EVENTS_QUEUE as PortalEventsQueue | undefined
    if (!queue?.send) throw new Error('Portal events queue is not configured')
    await queue.send({ kind: 'refresh-all' })
    console.info('[portal-events] Queued complete refresh')
    return { result: { queued: 1 } }
  },
})
