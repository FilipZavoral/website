import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPortalEvents,
  portalEventCacheKey,
  PortalEventsError,
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

const fetcher = (events: unknown, meetupRows: unknown = meetups, calls: string[] = []): PortalFetch => async (url, options) => {
  calls.push(url)
  assert.deepEqual(options, { timeout: 5_000, retry: 0 })
  return url.endsWith('/meetups') ? meetupRows : events
}

test('normalizes calendar fields and removes all Portal meetup metadata', async () => {
  const values = new Map<string, unknown>()
  const result = await getPortalEvents('brno', [brno], storage(values), fetcher([
    event({
      start: '2026-08-31 15:00',
      end: '2026-08-31 19:00',
      link: 'mailto:meetup@example.test?subject=Brno',
      location: 'Brno',
      description: 'Popis **události**',
      tags: [{ name: 'Začátečníci' }, { name: '' }, { locale: 'en' }],
      meetup: { id: 360 },
      meetup_id: 360,
      custom: 'retained',
    }),
  ]), now)

  assert.equal(result[0]?.id, '1')
  assert.equal(result[0]?.start, '2026-08-31T15:00:00.000Z')
  assert.equal(result[0]?.end, '2026-08-31T19:00:00.000Z')
  assert.equal(result[0]?.link, 'mailto:meetup@example.test?subject=Brno')
  assert.equal(result[0]?.safeLink, 'mailto:meetup@example.test?subject=Brno')
  assert.equal(result[0]?.custom, 'retained')
  assert.equal(result[0]?.meetup, undefined)
  assert.equal(result[0]?.meetup_id, undefined)
  assert.equal(result[0]?.['meetup.name'], undefined)
  assert.equal(result[0]?.['meetup.portalLink'], undefined)
  assert.deepEqual(result[0]?.tags, [{ name: 'Začátečníci' }, { name: '' }, { locale: 'en' }])
  assert.deepEqual(values.get(portalEventCacheKey('/brno')), {
    events: result,
    fetchedAt: now.toISOString(),
    validatedFromNonEmptySource: true,
  })
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
  assert.equal((values.get(portalEventCacheKey('/brno')) as { events: Array<{ link?: string, safeLink?: string }> }).events[0]?.link, 'javascript:alert(1)')
  assert.equal((values.get(portalEventCacheKey('/brno')) as { events: Array<{ link?: string, safeLink?: string }> }).events[0]?.safeLink, undefined)
})

test('a fresh cache avoids Portal while an old cache refresh failure falls back to usable data', async () => {
  const values = new Map<string, unknown>([[portalEventCacheKey('/brno'), {
    events: [{ id: '1', title: 'Cached', start: '2026-08-31T15:00:00.000Z', end: null, tags: [] }],
    fetchedAt: '2026-08-20T12:00:00.000Z',
  }]])
  let calls = 0
  const result = await getPortalEvents('brno', [brno], storage(values), async () => {
    calls += 1
    throw new Error('offline')
  }, now)
  assert.equal(calls, 2)
  assert.equal(result[0]?.title, 'Cached')

  ;(values.get(portalEventCacheKey('/brno')) as { fetchedAt: string }).fetchedAt = now.toISOString()
  await getPortalEvents('brno', [brno], storage(values), async () => assert.fail('fresh cache must not fetch'), now)
})

test('rejects an empty global Portal payload without caching it', async () => {
  const values = new Map<string, unknown>()

  await assert.rejects(
    getPortalEvents('brno', [brno], storage(values), fetcher([]), now),
    (error: unknown) => error instanceof PortalEventsError && error.statusCode === 502,
  )
  assert.equal(values.has(portalEventCacheKey('/brno')), false)
})

test('refreshes an unvalidated empty snapshot but allows zero matches from a non-empty Portal payload', async () => {
  const values = new Map<string, unknown>([[portalEventCacheKey('/brno'), {
    events: [],
    fetchedAt: now.toISOString(),
  }]])
  const calls: string[] = []
  const result = await getPortalEvents('brno', [brno], storage(values), fetcher([
    event({ 'meetup.portalLink': 'https://portal.example/other' }),
  ], meetups, calls), now)

  assert.deepEqual(result, [])
  assert.equal(calls.length, 2)
  assert.deepEqual(values.get(portalEventCacheKey('/brno')), {
    events: [],
    fetchedAt: now.toISOString(),
    validatedFromNonEmptySource: true,
  })
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
  assert.ok(values.has(portalEventCacheKey('/brno')))
  assert.ok(values.has(portalEventCacheKey('/ostrava')))
  assert.deepEqual(result.map(event => event.community), [
    { path: '/brno', name: 'Brno' },
    { path: '/ostrava', name: 'Ostrava' },
  ])
})
