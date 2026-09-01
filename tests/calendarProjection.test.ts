import assert from 'node:assert/strict'
import test from 'node:test'
import { eventJsonLd, projectCalendarEvents } from '../app/utils/calendar.ts'

test('Portal 15:00 UTC renders at 17:00 in Prague and uses the correct JSON-LD offset', () => {
  const event = { id: '1', title: 'Brno meetup', start: '2026-08-31T15:00:00.000Z', end: null, tags: [] }
  const events = projectCalendarEvents([event])
  assert.equal(events[0]?.startTime, '17:00')
  assert.equal(events[0]?.weekdayLabel, 'PO')
  assert.equal(JSON.parse(eventJsonLd([event]))['@graph'][0].startDate, '2026-08-31T17:00:00+02:00')
})

test('JSON-LD uses the Prague winter offset', () => {
  const event = { id: '1', title: 'Brno meetup', start: '2026-01-31T15:00:00.000Z', end: null, tags: [] }
  assert.equal(JSON.parse(eventJsonLd([event]))['@graph'][0].startDate, '2026-01-31T16:00:00+01:00')
})

test('JSON-LD uses aggregate event community metadata for its organizer', () => {
  const event = {
    id: '1',
    title: 'Brno meetup',
    start: '2026-08-31T15:00:00.000Z',
    end: null,
    tags: [],
    community: { path: '/brno', name: 'Brno' },
  }
  assert.deepEqual(JSON.parse(eventJsonLd([event]))['@graph'][0].organizer, {
    '@type': 'Organization',
    name: 'Brno',
    url: 'https://jednadvacet.org/brno',
  })
})

test('projection gives every event its Prague date and sorts by instant then numeric ID', () => {
  const events = projectCalendarEvents([
    { id: '20', title: 'Later ID', start: '2026-03-29T00:30:00.000Z', end: null, tags: [] },
    { id: '2', title: 'Earlier ID', start: '2026-03-29T00:30:00.000Z', end: null, tags: [] },
    { id: '30', title: 'Later event', start: '2026-03-29T01:30:00.000Z', end: null, tags: [] },
  ])
  assert.deepEqual(events.map(event => event.id), ['2', '20', '30'])
  assert.deepEqual(events.map(event => event.startTime), ['01:30', '01:30', '03:30'])
  assert.ok(events.every(event => event.dateLabel === '29. března 2026'))
})
