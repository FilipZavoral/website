---
last_mapped_commit: 406253b1b73b8ef1369805abfcfd98a6f3adb0d1
---

<!-- refreshed: 2026-09-01 -->
# Testing Patterns

**Analysis Date:** 2026-09-01

## Test Framework

**Runner:**
- Node's built-in `node:test` runner, invoked with TypeScript stripping. No Vitest, Jest, Playwright, or Vue Test Utils configuration is detected.
- Test files: `tests/calendarProjection.test.ts`, `tests/validateContentRoutes.test.ts`, `tests/portalEvents.test.ts`, and `tests/portalWebhook.test.ts`.

**Assertion Library:**
- `node:assert/strict`, using `equal`, `deepEqual`, `match`, `ok`, and `notEqual`.

**Run Commands:**
```bash
npm test
node --experimental-strip-types --test tests/*.test.ts
npm run typecheck
npm run build
```

`npm test` is defined in `package.json` as `node --experimental-strip-types --test tests/*.test.ts`. No watch or coverage command is configured.

## Test File Organization

**Location:**
- Tests are separated from application code in the root `tests/` directory.
- Pure client projections, server integration logic, webhook helpers, and route-validation scripts each have a focused test file.

**Naming:**
- Use the implementation subject followed by `.test.ts`, for example `calendarProjection.test.ts` and `portalEvents.test.ts`.

**Structure:**
```text
tests/
├── calendarProjection.test.ts
├── portalEvents.test.ts
├── portalWebhook.test.ts
└── validateContentRoutes.test.ts
```

## Test Structure

**Suite Organization:**
```ts
import assert from 'node:assert/strict'
import test from 'node:test'

test('projection gives every event its Prague date and sorts by instant then numeric ID', () => {
  const events = projectCalendarEvents([...])
  assert.deepEqual(events.map(event => event.id), ['2', '20', '30'])
})
```

**Patterns:**
- Each behavior is a top-level `test(...)`; nested `describe` suites are not used.
- Shared fixtures and injected adapters are defined near the top of a file (`brno`, `event`, `storage`, and `fetcher` in `tests/portalEvents.test.ts`).
- Async tests return an `async` function and use `await`; synchronous tests directly assert pure results.
- Temporary filesystem fixtures use `try/finally` cleanup (`tests/validateContentRoutes.test.ts`).
- Assertions verify public outputs and side effects, such as cache entries and fetch call counts, rather than implementation text.

## Mocking

**Framework:**
- No mocking library is used. Dependencies are replaced with small typed functions and in-memory adapters.

**Patterns:**
```ts
const storage = (values = new Map<string, unknown>()): PortalStorage => ({
  getItem: async key => values.get(key),
  setItem: async (key, value) => { values.set(key, value) },
})

const fetcher = (events: unknown, meetupRows = meetups): PortalFetch => async (url, options) => {
  assert.deepEqual(options, { timeout: 5_000, retry: 0 })
  return url.endsWith('/meetups') ? meetupRows : events
}
```

**What to Mock:**
- Mock network and persistence at injected boundaries (`PortalFetch` and `PortalStorage` in `server/utils/portalEvents.ts`).
- Use temporary directories and child processes when testing the actual route validator (`tests/validateContentRoutes.test.ts`).
- Supply a fixed `now` date to time-sensitive functions such as `getPortalEvents`.

**What NOT to Mock:**
- Do not mock pure projections such as `projectCalendarEvents` or `eventJsonLd`.
- Do not inspect source/configuration text with regular expressions; test stable public behavior and generated/runtime output.

## Fixtures and Factories

**Test Data:**
```ts
const event = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  'meetup.name': 'Jednadvacet Brno',
  title: 'Budoucí meetup',
  start: '2026-08-31 15:00',
  end: null,
  ...overrides,
})
```

**Location:**
- Small fixtures and factories are colocated with the tests that use them (`tests/portalEvents.test.ts`). There is no shared fixture directory.
- Content-route tests create Markdown fixtures in OS temporary directories and always remove them in `finally` blocks (`tests/validateContentRoutes.test.ts`).

## Coverage

**Requirements:**
- No coverage tool, threshold, or CI coverage requirement is configured.

**View Coverage:**
- Not applicable. Use `npm test`, `npm run typecheck`, and `npm run build` for current automated verification.

## Test Types

**Unit Tests:**
- Pure date/time and JSON-LD projection behavior is covered in `tests/calendarProjection.test.ts`.
- Portal normalization, cache fallback, sorting, and multi-community behavior are covered in `tests/portalEvents.test.ts`.
- HMAC signatures, replay windows, and webhook ID extraction are covered in `tests/portalWebhook.test.ts`.

**Integration Tests:**
- `tests/validateContentRoutes.test.ts` launches `scripts/validate-content-routes.ts` against temporary content trees and checks process status and diagnostics.
- No test directly boots Nitro, Nuxt Content, or a live external Portal service.

**E2E Tests:**
- No automated browser/E2E suite is detected. Manual browser verification is required for rendered routes, hydration, responsive UI, and interactive map/calendar behavior.

## Common Patterns

**Async Testing:**
```ts
test('fresh cache avoids Portal', async () => {
  const result = await getPortalEvents('brno', [brno], storage(values), fetcher(...), now)
  assert.equal(result[0]?.title, 'Cached')
})
```

**Error Testing:**
- Failure paths assert non-zero child-process status and diagnostic text (`tests/validateContentRoutes.test.ts`).
- Invalid or hostile input is tested through observable safe outputs, such as an unsafe URL being retained as raw `link` but omitted from `safeLink` (`tests/portalEvents.test.ts`).
- Use `assert.fail` in injected fakes when an unexpected call would invalidate the behavior under test.

**Required verification for changes:**
- Run `npm test` for test-covered logic.
- Run `npm run typecheck` after TypeScript or Vue changes.
- Run `npm run build` for content, routing, module, server/runtime, or configuration changes, then manually verify relevant rendered routes.

---

*Testing analysis: 2026-09-01*
