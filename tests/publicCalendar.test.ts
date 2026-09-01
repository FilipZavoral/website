import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPublicCalendarFeed,
  PublicCalendarError,
  type PublicCalendarDependencies,
} from '../server/routes/ical/[slug].get.ts'
import type { PortalCommunity } from '../server/utils/portalEvents.ts'

const brno: PortalCommunity = {
  id: 'brno',
  path: '/brno',
  title: 'Jednadvacet Brno',
  portalMeetupId: 360,
}

const calendarBody = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:event-1@example.test',
  'SEQUENCE:2',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

const dependencies = (fetcher: PublicCalendarDependencies['fetch']): PublicCalendarDependencies => ({
  communities: async () => [brno],
  fetch: fetcher,
})

test('configured slug returns the exact upstream calendar body with fresh inline headers', async () => {
  const requests: Array<{ url: string, init: RequestInit | undefined }> = []
  const response = await getPublicCalendarFeed('brno', dependencies(async (url, init) => {
    requests.push({ url, init })
    return new Response(calendarBody, {
      status: 200,
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'set-cookie': 'portal-session=secret',
        'x-portal-debug': 'do-not-forward',
      },
    })
  }))

  assert.deepEqual(requests, [{
    url: 'https://portal.einundzwanzig.space/stream-calendar?meetup=360',
    init: undefined,
  }])
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/calendar; charset=utf-8')
  assert.equal(response.headers.get('content-disposition'), 'inline')
  assert.equal(response.headers.get('set-cookie'), null)
  assert.equal(response.headers.get('x-portal-debug'), null)
  assert.equal(await response.text(), calendarBody)
})

test('public calendar output fails closed when it would expose the configured Portal meetup ID', async () => {
  await assert.rejects(
    getPublicCalendarFeed('brno', dependencies(async () => new Response(`BEGIN:VCALENDAR\r\nX-PORTAL-ID:${brno.portalMeetupId}\r\nEND:VCALENDAR`))),
    (error: unknown) => error instanceof PublicCalendarError && error.statusCode === 502,
  )
})
