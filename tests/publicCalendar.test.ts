import assert from 'node:assert/strict'
import test from 'node:test'
import ICAL from 'ical.js'
import {
  generateCalendar,
  getPublicCalendarFeed,
  parsePublicCalendarScope,
  PublicCalendarError,
  type PublicCalendarDependencies,
} from '../server/routes/ical/[slug].get.ts'
import type { PortalCalendarEvent, PortalCommunity, PortalStorage } from '../server/utils/portalEvents.ts'

const brno: PortalCommunity = { id: 'brno', path: '/brno', title: 'Brno', portalMeetupId: 360 }
const online: PortalCommunity = { id: 'online-poker', path: '/online-poker', title: 'Online poker', portalMeetupId: 367 }
const pribram: PortalCommunity = { id: 'pribram', path: '/pribram', title: 'Příbram' }
const now = new Date('2026-08-30T12:00:00.000Z')

const normalizedEvent = (id: string, title: string) => ({
  id,
  title,
  start: '2026-08-31T15:00:00.000Z',
  end: '2026-08-31T17:00:00.000Z',
  description: 'První řádek\nDruhý řádek',
  safeLink: 'https://example.test/event',
  osm_name: 'Bitcoin Coffee',
  osm_address: 'Brno, Česko',
  tags: [{ name: 'Začátečníci' }, { name: 'Praha' }],
})

const snapshot = (community: PortalCommunity, events: Array<ReturnType<typeof normalizedEvent>> = []) => ({
  schemaVersion: 1,
  community,
  events: events.map((event, index) => ({
    event,
    fingerprint: `fingerprint-${index}`,
    sequence: 10 + index,
    changedAt: now.toISOString(),
  })),
  cancellations: [],
  signals: {},
  fetchedAt: now.toISOString(),
})

const dependencies = (values = new Map<string, unknown>([
  ['community:brno', snapshot(brno, [normalizedEvent('1', 'Brněnský meetup')])],
  ['community:online-poker', snapshot(online, [normalizedEvent('2', 'Online meetup')])],
])): PublicCalendarDependencies => {
  const storage: PortalStorage = {
    getItem: async key => values.get(key),
    setItem: async (key, value) => { values.set(key, value) },
    getKeys: async base => [...values.keys()].filter(key => !base || key.startsWith(base)),
  }
  return { storage }
}

test('an unconfigured community has a valid empty cache-only feed', async () => {
  const response = await getPublicCalendarFeed('pribram', dependencies(new Map([
    ['community:pribram', snapshot(pribram)],
  ])))
  const calendar = ICAL.Component.fromString(await response.text())
  assert.equal(response.status, 200)
  assert.equal(calendar.getFirstPropertyValue('x-wr-calname'), 'Jednadvacet - Příbram')
  assert.deepEqual(calendar.getAllSubcomponents('vevent'), [])
})

test('configured scope returns an inline calendar with stable metadata', async () => {
  const response = await getPublicCalendarFeed('brno', dependencies())
  const calendar = ICAL.Component.fromString(await response.text())
  const event = calendar.getFirstSubcomponent('vevent')
  assert.equal(response.headers.get('content-type'), 'text/calendar; charset=utf-8')
  assert.equal(response.headers.get('content-disposition'), 'inline')
  assert.equal(response.headers.get('vary'), 'Sec-Fetch-Dest')
  assert.equal(calendar.getFirstPropertyValue('x-wr-calname'), 'Jednadvacet - Brno')
  assert.equal(event?.getFirstPropertyValue('uid'), 'meetup-event-1@einundzwanzig.space')
  assert.equal(event?.getFirstPropertyValue('summary'), 'Brněnský meetup')
  assert.equal(event?.getFirstPropertyValue('location'), 'Bitcoin Coffee, Brno, Česko')
})

test('comma-separated and all scopes merge snapshot keys without exposing meetup IDs', async () => {
  assert.deepEqual(parsePublicCalendarScope('online-poker,brno'), ['brno', 'online-poker'])
  for (const scope of ['brno,online-poker', 'all']) {
    const response = await getPublicCalendarFeed(scope, dependencies(new Map([
      ['portal:360:events', { schemaVersion: 1 }],
      ['community:brno', snapshot(brno, [normalizedEvent('1', 'Brněnský meetup')])],
      ['community:online-poker', snapshot(online, [normalizedEvent('2', 'Online meetup')])],
    ])))
    const body = await response.text()
    const calendar = ICAL.Component.fromString(body)
    assert.deepEqual(calendar.getAllSubcomponents('vevent').map(event => event.getFirstPropertyValue('summary')), [
      'Brno - Brněnský meetup',
      'Online poker - Online meetup',
    ])
    assert.doesNotMatch(body, /meetup=360|X-PORTAL/i)
  }
})

test('browser document navigations receive readable plain text', async () => {
  const response = await getPublicCalendarFeed('brno', dependencies(), true)
  assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8')
  assert.match(await response.text(), /^BEGIN:VCALENDAR/)
})

test('generated cancellation preserves UID and sequence', () => {
  const item: PortalCalendarEvent = {
    event: normalizedEvent('1', 'Zrušený meetup'),
    sequence: 10,
    changedAt: now.toISOString(),
    cancelled: true,
    community: brno,
  }
  const calendar = ICAL.Component.fromString(generateCalendar('Jednadvacet', [item]))
  const event = calendar.getFirstSubcomponent('vevent')
  assert.equal(event?.getFirstPropertyValue('status'), 'CANCELLED')
  assert.equal(event?.getFirstPropertyValue('sequence'), 10)
})

test('cancellation wins when active and cancelled revisions have equal sequence', () => {
  const active: PortalCalendarEvent = {
    event: normalizedEvent('1', 'Meetup'),
    sequence: 10,
    changedAt: now.toISOString(),
    cancelled: false,
    community: brno,
  }
  const calendar = ICAL.Component.fromString(generateCalendar('Jednadvacet', [active, { ...active, cancelled: true }]))
  assert.equal(calendar.getAllSubcomponents('vevent').length, 1)
  assert.equal(calendar.getFirstSubcomponent('vevent')?.getFirstPropertyValue('status'), 'CANCELLED')
})

test('calendar serialization keeps the newest revision for a subscribed event', () => {
  const original: PortalCalendarEvent = {
    event: normalizedEvent('1', 'Původní název'),
    sequence: 10,
    changedAt: now.toISOString(),
    cancelled: false,
    community: brno,
  }
  const updated: PortalCalendarEvent = {
    ...original,
    event: { ...original.event, title: 'Aktualizovaný název' },
    sequence: 11,
    changedAt: '2026-08-30T13:00:00.000Z',
  }

  const calendar = ICAL.Component.fromString(generateCalendar('Jednadvacet', [original, updated]))
  const event = calendar.getFirstSubcomponent('vevent')

  assert.equal(calendar.getAllSubcomponents('vevent').length, 1)
  assert.equal(event?.getFirstPropertyValue('uid'), 'meetup-event-1@einundzwanzig.space')
  assert.equal(event?.getFirstPropertyValue('summary'), 'Aktualizovaný název')
  assert.equal(event?.getFirstPropertyValue('sequence'), 11)
  assert.equal(event?.getFirstPropertyValue('status'), 'CONFIRMED')
})

test('malformed, numeric, duplicate, unknown, and query-extended scopes fail safely', async () => {
  for (const scope of ['360', 'brno/../../private', 'brno,,online-poker', 'brno,brno', undefined]) {
    assert.throws(() => parsePublicCalendarScope(scope), PublicCalendarError)
  }
  assert.throws(() => parsePublicCalendarScope('brno', { upstream: 'invalid' }), PublicCalendarError)
  await assert.rejects(
    getPublicCalendarFeed('unknown', dependencies()),
    (error: unknown) => error instanceof PublicCalendarError && error.statusCode === 404,
  )
})

test('incompatible snapshots and an empty all scope return a safe unavailable error', async () => {
  for (const values of [new Map<string, unknown>(), new Map<string, unknown>([
    ['community:brno', { schemaVersion: 2 }],
  ])]) {
    await assert.rejects(
      getPublicCalendarFeed(values.size ? 'brno' : 'all', dependencies(values)),
      (error: unknown) => error instanceof PublicCalendarError && error.statusCode === 503,
    )
  }
})
