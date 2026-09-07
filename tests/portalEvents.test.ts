import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearPortalEventCancellation,
  getPortalEvents,
  getPortalCalendarEvents,
  markPortalEventCancelled,
  portalEventCacheKey,
  PortalEventsError,
  refreshPortalMeetups,
  type PortalCommunity,
  type PortalFetch,
  type PortalStorage,
} from '../server/utils/portalEvents.ts'

const brno: PortalCommunity = { id: 'brno', path: '/brno', title: 'Brno', portalMeetupId: 360 }
const now = new Date('2026-08-30T12:00:00.000Z')

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  'meetup.name': 'Jednadvacet Brno',
  'meetup.portalLink': 'https://portal.einundzwanzig.space/cz/meetup/jednadvacet-brno',
  title: 'Budoucí meetup',
  start: '2026-08-31 15:00',
  end: null,
  link: 'https://portal.example/events/1',
  ...overrides,
})

const meetups = [{ id: 360, portalLink: 'https://portal.einundzwanzig.space/cz/meetup/jednadvacet-brno' }]

const storage = (values = new Map<string, unknown>()): PortalStorage => ({
  getItem: async key => values.get(key),
  setItem: async (key, value) => { values.set(key, value) },
})

const cachedSnapshot = (events: Array<Record<string, unknown>>, fetchedAt = now.toISOString()) => ({
  schemaVersion: 1,
  events: events.map((event, index) => ({
    event,
    fingerprint: `fingerprint-${index}`,
    sequence: 1_788_177_600 + index,
    changedAt: fetchedAt,
  })),
  cancellations: [],
  fetchedAt,
  validatedFromNonEmptySource: true,
})

const fetcher = (events: unknown, meetupRows: unknown = meetups, calls: string[] = []): PortalFetch => async (url, options) => {
  calls.push(url)
  assert.deepEqual(options, { timeout: 5_000, retry: 0 })
  return url.endsWith('/meetups') ? meetupRows : events
}

test('normalizes calendar fields and removes all Portal meetup metadata', async () => {
  const values = new Map<string, unknown>()
  const calls: string[] = []
  const result = await getPortalEvents('brno', [brno], storage(values), fetcher([
    event({
      start: '2026-08-31 15:00',
      end: '2026-08-31 19:00',
      link: 'mailto:meetup@example.test?subject=Brno',
      location: 'Brno',
      osm_type: 'node',
      osm_id: 123,
      osm_name: 'Bitcoin Coffee',
      osm_address: 'Brno, Česko',
      osm_lat: '49.195278',
      osm_lon: '16.608333',
      description: 'Popis **události**',
      tags: [{ name: 'Začátečníci' }, { name: '' }, { locale: 'en' }],
      meetup: { id: 360 },
      meetup_id: 360,
      custom: 'retained',
    }),
  ], meetups, calls), now)

  assert.equal(result[0]?.id, '1')
  assert.equal(result[0]?.start, '2026-08-31T15:00:00.000Z')
  assert.equal(result[0]?.end, '2026-08-31T19:00:00.000Z')
  assert.equal(result[0]?.link, 'mailto:meetup@example.test?subject=Brno')
  assert.equal(result[0]?.safeLink, 'mailto:meetup@example.test?subject=Brno')
  assert.equal(result[0]?.osm_name, 'Bitcoin Coffee')
  assert.equal(result[0]?.osm_lat, '49.195278')
  assert.equal(result[0]?.osm_lon, '16.608333')
  assert.equal(result[0]?.custom, 'retained')
  assert.equal(result[0]?.meetup, undefined)
  assert.equal(result[0]?.meetup_id, undefined)
  assert.equal(result[0]?.['meetup.name'], undefined)
  assert.equal(result[0]?.['meetup.portalLink'], undefined)
  assert.deepEqual(result[0]?.tags, [{ name: 'Začátečníci' }, { name: '' }, { locale: 'en' }])
  assert.ok(calls.includes('https://portal.einundzwanzig.space/api/meetup-events?locale=cs'))
  const snapshot = values.get(portalEventCacheKey(brno.portalMeetupId)) as {
    schemaVersion: number
    events: Array<{ event: unknown, sequence: number, changedAt: string }>
    cancellations: unknown[]
  }
  assert.equal(snapshot.schemaVersion, 1)
  assert.deepEqual(snapshot.events.map(item => item.event), result)
  assert.equal(snapshot.events[0]?.sequence, Math.floor(now.getTime() / 1_000))
  assert.equal(snapshot.events[0]?.changedAt, now.toISOString())
  assert.deepEqual(snapshot.cancellations, [])
})

test('omits null optional fields so a freshly written live cache remains readable', async () => {
  const values = new Map<string, unknown>()
  const result = await getPortalEvents('brno', [brno], storage(values), fetcher([
    event({ link: null, safeLink: 'javascript:alert(1)', location: null, osm_name: null, osm_lat: '91', osm_lon: 'invalid', description: null }),
  ]), now)

  assert.equal(result.length, 1)
  assert.equal(result[0]?.link, undefined)
  assert.equal(result[0]?.safeLink, undefined)
  assert.equal(result[0]?.location, undefined)
  assert.equal(result[0]?.osm_name, undefined)
  assert.equal(result[0]?.osm_lat, undefined)
  assert.equal(result[0]?.osm_lon, undefined)
  assert.equal(result[0]?.description, undefined)
})

test('filters by the configured Portal meetup while retaining non-meetup properties', async () => {
  const result = await getPortalEvents('brno', [brno], storage(), fetcher([
    event({ description: 'private', creator: { email: 'private@example.test' }, meetup: { id: 360 }, meetup_id: 360 }),
    event({ id: 2, start: '2026-08-30 10:00', end: '2026-08-30 11:00' }),
    event({ id: 3, 'meetup.portalLink': 'https://portal.example/other', title: 'Other community' }),
  ]), now)
  assert.equal(result.length, 1)
  assert.equal(result[0]?.description, 'private')
  assert.deepEqual(result[0]?.creator, { email: 'private@example.test' })
  assert.equal(result[0]?.meetup, undefined)
  assert.equal(result[0]?.meetup_id, undefined)
  assert.equal(result[0]?.['meetup.portalLink'], undefined)
  assert.equal(result[0]?.['meetup.name'], undefined)
})

test('preserves raw executable links but does not mark them safe for calendar navigation', async () => {
  const values = new Map<string, unknown>()
  const result = await getPortalEvents('brno', [brno], storage(values), fetcher([event({ link: 'javascript:alert(1)' })]), now)
  assert.equal(result[0]?.link, 'javascript:alert(1)')
  assert.equal(result[0]?.safeLink, undefined)
  const cached = values.get(portalEventCacheKey(brno.portalMeetupId)) as { events: Array<{ event: { link?: string, safeLink?: string } }> }
  assert.equal(cached.events[0]?.event.link, 'javascript:alert(1)')
  assert.equal(cached.events[0]?.event.safeLink, undefined)
})

test('a fresh cache avoids Portal while an old cache refresh failure falls back to usable data', async () => {
  const values = new Map<string, unknown>([[portalEventCacheKey(brno.portalMeetupId), cachedSnapshot([
    { id: '1', title: 'Cached', start: '2026-08-31T15:00:00.000Z', end: null, tags: [] },
  ], '2026-08-20T12:00:00.000Z')]])
  let calls = 0
  const result = await getPortalEvents('brno', [brno], storage(values), async () => {
    calls += 1
    throw new Error('offline')
  }, now)
  assert.equal(calls, 2)
  assert.equal(result[0]?.title, 'Cached')

  ;(values.get(portalEventCacheKey(brno.portalMeetupId)) as { fetchedAt: string }).fetchedAt = now.toISOString()
  await getPortalEvents('brno', [brno], storage(values), async () => assert.fail('fresh cache must not fetch'), now)
})

test('rejects an empty global Portal payload without caching it', async () => {
  const values = new Map<string, unknown>()

  await assert.rejects(
    getPortalEvents('brno', [brno], storage(values), fetcher([]), now),
    (error: unknown) => error instanceof PortalEventsError && error.statusCode === 502,
  )
  assert.equal(values.has(portalEventCacheKey(brno.portalMeetupId)), false)
})

test('rejects equal or reversed event time ranges before caching', async () => {
  for (const end of ['2026-08-31 15:00', '2026-08-31 14:00']) {
    await assert.rejects(
      getPortalEvents('brno', [brno], storage(), fetcher([event({ end })]), now),
      (error: unknown) => error instanceof PortalEventsError && error.statusCode === 502,
    )
  }
})

test('refreshes an unvalidated empty snapshot but allows zero matches from a non-empty Portal payload', async () => {
  const values = new Map<string, unknown>([[portalEventCacheKey(brno.portalMeetupId), {
    events: [],
    fetchedAt: now.toISOString(),
  }]])
  const calls: string[] = []
  const result = await getPortalEvents('brno', [brno], storage(values), fetcher([
    event({ 'meetup.portalLink': 'https://portal.example/other' }),
  ], meetups, calls), now)

  assert.deepEqual(result, [])
  assert.equal(calls.length, 2)
  const snapshot = values.get(portalEventCacheKey(brno.portalMeetupId)) as { events: unknown[], cancellations: unknown[] }
  assert.deepEqual(snapshot.events, [])
  assert.deepEqual(snapshot.cancellations, [])
})

test('cold all performs one full fetch pair, populates every community key, and adds community paths and names', async () => {
  const ostrava: PortalCommunity = { id: 'ostrava', path: '/ostrava', title: 'Ostrava', portalMeetupId: 500 }
  const values = new Map<string, unknown>()
  const calls: string[] = []
  const result = await getPortalEvents('all', [brno, ostrava], storage(values), fetcher([
    event(),
    event({ id: 2, 'meetup.name': 'Ostrava', 'meetup.portalLink': 'https://portal.example/ostrava' }),
  ], [...meetups, { id: 500, portalLink: 'https://portal.example/ostrava' }], calls), now)

  assert.equal(calls.length, 2)
  assert.ok(values.has(portalEventCacheKey(brno.portalMeetupId)))
  assert.ok(values.has(portalEventCacheKey(ostrava.portalMeetupId)))
  assert.deepEqual(result.map(event => event.community), [
    { path: '/brno', name: 'Brno' },
    { path: '/ostrava', name: 'Ostrava' },
  ])
})

test('webhook-confirmed deletions remain calendar cancellations for 90 days', async () => {
  const values = new Map<string, unknown>()
  const store = storage(values)
  await getPortalEvents('brno', [brno], store, fetcher([event()]), now)
  const cancelledAt = new Date('2026-08-31T12:00:00.000Z')
  assert.equal(await markPortalEventCancelled(brno, '1', store, cancelledAt), true)

  const calendarEvents = await getPortalCalendarEvents(['brno'], [brno], store, async () => assert.fail('fresh cache must not fetch'), cancelledAt)
  assert.equal(calendarEvents.length, 1)
  assert.equal(calendarEvents[0]?.cancelled, true)
  assert.equal(calendarEvents[0]?.event.id, '1')
  assert.ok((calendarEvents[0]?.sequence ?? 0) > Math.floor(now.getTime() / 1_000))

  const afterRetention = new Date(cancelledAt.getTime() + 90 * 24 * 60 * 60 * 1_000)
  ;(values.get(portalEventCacheKey(brno.portalMeetupId)) as { fetchedAt: string }).fetchedAt = afterRetention.toISOString()
  const expired = await getPortalCalendarEvents(['brno'], [brno], store, async () => assert.fail('fresh cache must not fetch'), afterRetention)
  assert.deepEqual(expired, [])
})

test('a cancellation suppresses stale Portal rows until a later webhook restores the event ID', async () => {
  const values = new Map<string, unknown>()
  const store = storage(values)
  await refreshPortalMeetups([brno], store, fetcher([event()]), now)
  const cancelledAt = new Date('2026-08-30T13:00:00.000Z')
  await markPortalEventCancelled(brno, '1', store, cancelledAt)

  await refreshPortalMeetups([brno], store, fetcher([event()]), new Date('2026-08-30T14:00:00.000Z'))
  let calendarEvents = await getPortalCalendarEvents(['brno'], [brno], store, async () => assert.fail('fresh cache must not fetch'), cancelledAt)
  assert.deepEqual(calendarEvents.map(item => ({ id: item.event.id, cancelled: item.cancelled })), [
    { id: '1', cancelled: true },
  ])

  assert.equal(await clearPortalEventCancellation(brno, '1', store), true)
  await refreshPortalMeetups([brno], store, fetcher([event({ title: 'Obnovený meetup' })]), new Date('2026-08-30T15:00:00.000Z'))
  calendarEvents = await getPortalCalendarEvents(['brno'], [brno], store, async () => assert.fail('fresh cache must not fetch'), cancelledAt)
  assert.deepEqual(calendarEvents.map(item => ({ title: item.event.title, cancelled: item.cancelled })), [
    { title: 'Obnovený meetup', cancelled: false },
  ])
})

test('a cold delete can become a tombstone after stale upstream data is refreshed', async () => {
  const values = new Map<string, unknown>()
  const store = storage(values)
  assert.equal(await markPortalEventCancelled(brno, '1', store, now), false)
  await refreshPortalMeetups([brno], store, fetcher([event()]), now)
  assert.equal(await markPortalEventCancelled(brno, '1', store, now), true)
  const calendarEvents = await getPortalCalendarEvents(['brno'], [brno], store, async () => assert.fail('fresh cache must not fetch'), now)
  assert.equal(calendarEvents[0]?.cancelled, true)
})

test('calendar sequence remains stable until relevant event content changes', async () => {
  const values = new Map<string, unknown>()
  const store = storage(values)
  await refreshPortalMeetups([brno], store, fetcher([event()]), now)
  const original = await getPortalCalendarEvents(['brno'], [brno], store, async () => assert.fail('fresh cache must not fetch'), now)

  const unchangedAt = new Date(now.getTime() + 60_000)
  await refreshPortalMeetups([brno], store, fetcher([event({ attendees: 42 })]), unchangedAt)
  const unchanged = await getPortalCalendarEvents(['brno'], [brno], store, async () => assert.fail('fresh cache must not fetch'), unchangedAt)
  assert.equal(unchanged[0]?.sequence, original[0]?.sequence)
  assert.equal(unchanged[0]?.changedAt, original[0]?.changedAt)

  const changedAt = new Date(now.getTime() + 120_000)
  await refreshPortalMeetups([brno], store, fetcher([event({ title: 'Změněný meetup' })]), changedAt)
  const changed = await getPortalCalendarEvents(['brno'], [brno], store, async () => assert.fail('fresh cache must not fetch'), changedAt)
  assert.ok((changed[0]?.sequence ?? 0) > (original[0]?.sequence ?? 0))
  assert.equal(changed[0]?.changedAt, changedAt.toISOString())
})
