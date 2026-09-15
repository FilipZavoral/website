---
last_mapped_commit: 599ee9aa4c15c119dae17486c0f6ea5999b32b9e
last_mapped_at: 2026-09-15
---
# Testing Patterns

**Analysis Date:** 2026-09-15

## Test Framework

**Runner:**

- Node.js built-in `node:test` runner with TypeScript executed by Node's `--experimental-strip-types` flag.
- Config: No separate test configuration file is present. The command is defined in `package.json` as `node --experimental-strip-types --test tests/*.test.ts`.

**Assertion Library:**

- Node's `node:assert/strict`, imported as `assert` in every test file, provides equality, matching, rejection, and exception assertions.
- HTTP and external-library outputs are checked through stable public behavior, such as parsed iCalendar components in `tests/publicCalendar.test.ts`.

**Run Commands:**

```bash
npm test                                      # Run all top-level tests
node --experimental-strip-types --test tests/*.test.ts  # Equivalent direct runner command
npm run typecheck                             # Validate TypeScript and generated Nuxt/Vue types
npm run build                                 # Validate route sources and the production Nuxt build
```

No dedicated watch-mode or coverage command is defined in `package.json`.

## Test File Organization

**Location:**

- Tests are separated from production code in the top-level `tests/` directory.
- Test files import the public or intentionally exported functions under test from `app/`, `server/`, and `scripts/`, for example `tests/calendarProjection.test.ts` and `tests/validateContentRoutes.test.ts`.

**Naming:**

- Use `<domain>.test.ts`, such as `tests/googleCalendar.test.ts`, `tests/miners.test.ts`, and `tests/communityHeroMaps.test.ts`.
- Name tests as complete behavior statements beginning with a lower-case phrase: `test('a newer update restores an event...')` in `tests/portalEvents.test.ts`.

**Structure:**

```text
tests/
├── communityHeroMaps.test.ts
├── communityProjection.test.ts
├── calendarProjection.test.ts
├── eventsAdmin.test.ts
├── googleCalendar.test.ts
├── miners.test.ts
├── portalEvents.test.ts
├── portalEventsQueue.test.ts
├── portalWebhook.test.ts
├── publicCalendar.test.ts
└── validateContentRoutes.test.ts
```

## Test Structure

**Suite Organization:**

```typescript
import assert from 'node:assert/strict'
import test from 'node:test'
import { projectCommunities } from '../app/composables/content.ts'

test('community projection orders cities using Czech collation', () => {
  const projection = projectCommunities([
    { path: '/zatec', title: 'Žatec', region: 'Ústecký' },
    { path: '/chomutov', title: 'Chomutov', region: 'Ústecký' },
  ])

  assert.deepEqual(projection.regions[0]?.communities.map(item => item.title), [
    'Chomutov',
    'Žatec',
  ])
})
```

**Patterns:**

- Use one independent `test()` per behavior or invariant; avoid nested `describe` suites.
- Build small local factories and dependency doubles at the top of a file, such as `event`, `storage`, `fetcher`, and `portalEvent` in `tests/portalEvents.test.ts` and `tests/googleCalendar.test.ts`.
- Assert exact structured output with `assert.deepEqual` when ordering and field filtering matter; use `assert.equal` for scalar outcomes.
- Use `assert.ok` for presence and boolean conditions, `assert.match`/`assert.doesNotMatch` for safe strings, and `assert.throws`/`assert.rejects` for validation and async failures.
- Keep tests deterministic with fixed dates and explicit clocks, such as `now` in `tests/portalEvents.test.ts` and `tests/publicCalendar.test.ts`.

## Mocking

**Framework:**

- Node test context mocking via `t.mock.method`, plus hand-written injected function and storage doubles. No Vitest, Jest, Sinon, or Vue Test Utils setup is detected.

**Patterns:**

```typescript
const fetcher: PortalFetch = async (url, options) => {
  calls.push(url)
  assert.deepEqual(options, { timeout: 5_000, retry: 0 })
  return url.endsWith('/meetups') ? meetupRows : events
}

test('transport failures log safe endpoint diagnostics', async t => {
  const logs: unknown[][] = []
  t.mock.method(console, 'error', (...args: unknown[]) => logs.push(args))
  // invoke the public operation and assert the sanitized log
})
```

This pattern is used in `tests/portalEvents.test.ts`; network and storage dependencies are injected rather than globally mocked.

**What to Mock:**

- Mock external HTTP with typed fetcher functions returning `Response.json(...)` or controlled errors, as in `tests/communityHeroMaps.test.ts` and `tests/googleCalendar.test.ts`.
- Mock persistence with an in-memory `Map` implementing the narrow `PortalStorage` or `MinersStorage` contract in `tests/portalEvents.test.ts` and `tests/miners.test.ts`.
- Mock console methods only when verifying safe operational logging, as in `tests/communityHeroMaps.test.ts` and `tests/portalEvents.test.ts`.
- Mock filesystem boundaries with temporary directories and clean them in `finally`, as in `tests/validateContentRoutes.test.ts`.

**What NOT to Mock:**

- Do not mock pure projections, parsers, URL builders, or error classes; call them directly through their exported APIs.
- Do not mock the iCalendar parser in `tests/publicCalendar.test.ts`; parse generated output with `ical.js` to verify the actual format.
- Do not assert implementation internals or source text. Test observable return values, requests, writes, response headers, and sanitized errors.

## Fixtures and Factories

**Test Data:**

```typescript
const brno: PortalCommunity = { id: 'brno', path: '/brno', title: 'Brno', portalMeetupId: 360 }
const now = new Date('2026-08-30T12:00:00.000Z')

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Budoucí meetup',
  start: '2026-08-31 15:00',
  end: null,
  ...overrides,
})
```

**Location:**

- Fixtures are local constants and factory functions inside the relevant test file; no shared `fixtures/` or factory module is detected.
- Prefer domain-valid minimal objects, then use an `overrides` parameter for scenario-specific fields, as in `tests/portalEvents.test.ts` and `tests/googleCalendar.test.ts`.
- Keep fixture data in the language and formats expected by the integration: Czech collation in `tests/communityProjection.test.ts`, Prague timezone dates in `tests/calendarProjection.test.ts`, and Portal payload field names in `tests/portalEvents.test.ts`.

## Coverage

**Requirements:**

- No coverage target, threshold, or coverage configuration is detected.
- The test suite has strongest coverage around server-side integration utilities and pure data projections; Vue component rendering and browser interactions are not covered by automated tests.

**View Coverage:**

```bash

# Not configured

```

## Test Types

**Unit Tests:**

- Most tests are unit-level tests of pure functions, parsers, normalizers, cache projections, authentication checks, and error classification. Examples include `tests/calendarProjection.test.ts`, `tests/eventsAdmin.test.ts`, and `tests/miners.test.ts`.

**Integration Tests:**

- Integration-style tests exercise complete utility workflows with injected HTTP and storage dependencies, including cache refreshes, queue parsing, Google synchronization, public iCalendar generation, and route-source validation. See `tests/portalEvents.test.ts`, `tests/googleCalendar.test.ts`, `tests/publicCalendar.test.ts`, and `tests/validateContentRoutes.test.ts`.
- The suite does not start a Nuxt server or use a live database, Cloudflare binding, Portal API, Mapbox API, or Google API.

**E2E Tests:**

- No browser or end-to-end test framework is detected. SSR, hydration, responsive interaction, and rendered component behavior require manual/browser verification outside `npm test`.

## Common Patterns

**Async Testing:**

```typescript
await assert.rejects(
  getPortalEvents('unknown', storage()),
  (error: unknown) => error instanceof PortalEventsError && error.statusCode === 404,
)
```

Use async test callbacks and `assert.rejects` for promises; pass a predicate when the domain error type and status are part of the contract, as in `tests/publicCalendar.test.ts`.

**Error Testing:**

```typescript
assert.throws(
  () => parseCommunityMapSource({ slug: '../brno', map: { lat: 49.19, lng: 16.61 } }),
  /slug/,
)
```

- Check both rejection and safe diagnostics when security behavior matters. `tests/communityHeroMaps.test.ts`, `tests/googleCalendar.test.ts`, and `tests/portalEvents.test.ts` ensure tokens and sensitive upstream messages do not leak.
- Exercise malformed, missing, duplicate, stale, and boundary inputs in loops where the same contract applies, as in `tests/communityHeroMaps.test.ts` and `tests/publicCalendar.test.ts`.
- Use `try/finally` around temporary filesystem fixtures to guarantee cleanup, as in `tests/validateContentRoutes.test.ts`.

---

*Testing analysis: 2026-09-15*
