---
last_mapped_commit: 599ee9aa4c15c119dae17486c0f6ea5999b32b9e
last_mapped_at: 2026-09-15
---
# Coding Conventions

**Analysis Date:** 2026-09-15

## Naming Patterns

**Files:**

- Vue components use PascalCase, such as `app/components/CommunityMap.vue` and `app/components/LightningQrCode.vue`.
- Composables and utilities use lower camel case filenames, such as `app/composables/content.ts` and `app/utils/calendar.ts`.
- Server route filenames follow Nuxt HTTP suffix conventions, such as `server/api/events/index.get.ts` and `server/api/events/refresh.post.ts`.
- Tests use the behavior-oriented `.test.ts` suffix in the top-level `tests/` directory, such as `tests/portalEvents.test.ts`.

**Functions:**

- Use lower camel case for functions and composables: `projectCalendarEvents` in `app/utils/calendar.ts`, `useDataCommunities` in `app/composables/content.ts`, and `getPortalEvents` in `server/utils/portalEvents.ts`.
- Prefix composables with `use`, and name pure transformations with a verb or domain noun: `useCommunityProjection`, `parseEvent`, `generateCommunityMaps`.
- Use concise predicate names beginning with `is`, `has`, or `can`, such as `isRecord`, `isPortalEvent`, and `hasActiveFilter`.

**Variables:**

- Use lower camel case for locals, props, and reactive state: `selectedTags`, `filteredEvents`, and `communityMapsCron`.
- Use descriptive domain names rather than abbreviations in application logic; acronyms remain in external field names such as `osm_lat` and `portal_meetup_id` when preserving upstream/content schemas.
- Use `UPPER_SNAKE_CASE` for module constants only when they are stable shared values, such as the map dimensions in `app/utils/communityMap.ts`; local constants commonly remain lower camel case, such as `pageSize` in `app/components/content/Calendar.vue`.

**Types:**

- Use PascalCase for interfaces, type aliases, and classes: `PortalCommunity`, `PortalCalendarEvent`, `CalendarEventRow`, and `PortalEventsError`.
- Prefer explicit interfaces for public dependency contracts and records in server utilities, for example `PortalStorage` and `PortalFetch` in `server/utils/portalEvents.ts`.
- Use discriminated unions for page results, such as `PageResult` in `app/pages/[...slug].vue` and `BlogResult` in `app/pages/blog/[[slug]].vue`.
- Use `type` imports when importing only types, as in `app/pages/[...slug].vue` and `app/components/content/Calendar.vue`.

## Code Style

**Formatting:**

- No repository ESLint, Prettier, Biome, or formatting configuration is detected; preserve the established manual style.
- Use two-space indentation, single quotes in TypeScript, trailing commas in multiline objects/arrays/parameters, and semicolons only where syntax requires them. Examples are `app/composables/content.ts` and `server/utils/portalEvents.ts`.
- Keep arrow functions and simple guards concise, but use multiline expressions when chained transformations become difficult to scan, as in `projectCommunities` in `app/composables/content.ts`.
- Keep Vue files organized as `<script setup lang="ts">`, template, and optional scoped style sections. Components such as `app/components/CommunityMap.vue` follow this order.

**Linting:**

- No lint script or lint configuration is present in `package.json` or the repository root.
- Use `npm run typecheck` as the available static verification for TypeScript and Vue template types; do not introduce untyped boundaries without a framework-hook reason.
- Generated Nuxt types are consumed through the root `tsconfig.json` project references rather than hand-written application compiler options.

## Import Organization

**Order:**

1. External runtime and framework imports, for example `h3` or `@nuxt/content`, appear first.
2. Type-only imports are placed alongside the owning package or module.
3. Project aliases and relative imports follow, generally grouped by alias or local path.
4. A blank line separates logically distinct import groups in larger modules, as in `tests/communityHeroMaps.test.ts` and `server/api/events/refresh.post.ts`.

**Path Aliases:**

- Use Nuxt aliases such as `#shared/types/portalEvents`, `#shared/data/partners`, and `~/composables/content`.
- Use relative imports for adjacent server and test modules when the path is explicit, such as `../server/utils/portalEvents.ts` in `tests/portalEvents.test.ts`.
- Let Nuxt auto-import framework composables and utilities in Vue files; components such as `app/components/content/Calendar.vue` do not import `computed`, `ref`, `watch`, or `useFetch`.

## Error Handling

**Patterns:**

- Validate untrusted values at the boundary and throw a domain-specific error with a safe public message. `server/utils/portalEvents.ts` uses `PortalEventsError` for malformed upstream data and status codes.
- Convert server-route failures to H3 errors with an appropriate status code and user-safe status message, as in `server/api/events/index.get.ts` and `server/api/events/refresh.post.ts`.
- Narrow `unknown` with type guards such as `isRecord`, `isPortalEvent`, and `isCommunity` before accessing fields in `server/utils/portalEvents.ts`.
- Catch external transport failures, log only safe diagnostics, and discard sensitive upstream messages. See `fetchPayload` in `server/utils/portalEvents.ts` and Google API handling in `server/utils/googleCalendar.ts`.
- Treat stale cached data as an explicit fallback where the domain permits it; `server/utils/miners.ts` returns a stale snapshot when the upstream refresh fails.
- In Vue pages, throw a fatal 404 after a typed content query returns no result, as in `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue`.

## Logging

**Framework:** `console` with structured, prefixed messages.

**Patterns:**

- Prefix background integration logs with the subsystem, for example `[portal-events]` in `server/utils/portalEvents.ts` and `[community-maps]` in `server/utils/staticMap.ts`.
- Log error category, endpoint, error type, and status rather than raw upstream error objects or credentials; `fetchPayload` in `server/utils/portalEvents.ts` demonstrates this boundary.
- Route handlers may log the caught error for server diagnostics, but responses must use safe messages outside development, as in `server/api/events/index.get.ts`.
- Avoid logging expected client validation failures unless the route needs operational visibility.

## Comments

**When to Comment:**

- Comment non-obvious framework, deployment, security, cache, or data-integrity constraints, as in `nuxt.config.ts` and `server/utils/portalEvents.ts`.
- Prefer comments that explain why a constraint exists, such as the Cloudflare `sharp` alias in `nuxt.config.ts`, instead of narrating obvious code.
- Use short inline comments for security-sensitive transformations, such as the XSS-safe `<` escaping in `app/utils/calendar.ts`.

**JSDoc/TSDoc:**

- Add short JSDoc to exported utilities or complex transformations that establish a shared invariant: `eventJsonLd`, `projectCalendarEvents`, and `osmMapUri` in `app/utils/calendar.ts`.
- Do not add documentation blocks to trivial local helpers unless they clarify an external contract.

## Function Design

**Size:**

- Keep pure projection, validation, and formatting helpers small and composable, as in `app/utils/calendar.ts`.
- Larger orchestration functions are permitted for integration workflows; keep their steps visible through named helpers and explicit stages, as in `refreshPortalMeetups` in `server/utils/portalEvents.ts`.

**Parameters:**

- Use narrow object contracts and `Pick`/`Partial` at boundaries, for example `osmMapUri` accepts only the OSM fields it needs in `app/utils/calendar.ts`.
- Inject fetchers, storage, clocks, and other side effects into server utilities so tests can provide deterministic doubles; see `PortalFetch`, `PortalStorage`, and the `now` parameter in `server/utils/portalEvents.ts`.
- Use optional parameters with concrete defaults for testable time and signal behavior, rather than reading mutable global state inside pure logic.

**Return Values:**

- Return typed domain values or explicit `undefined`/`null` for absent optional results; `osmMapUri` returns `string | undefined`.
- Preserve immutable inputs in projections by copying before sorting or enriching, as `projectCalendarEvents` does in `app/utils/calendar.ts`.
- Return structured reports for batch work, such as `{ generated, images }` from `generateCommunityMaps` and `{ created, updated, deleted }` from Google synchronization.

## Module Design

**Exports:**

- Export reusable pure functions, parsers, domain errors, and dependency types from server utility modules so they can be tested directly; `server/utils/portalEvents.ts` and `server/utils/googleCalendar.ts` follow this pattern.
- Keep implementation-only helpers private within the module, such as `parseCacheForWrite` and `futureEvents` in `server/utils/portalEvents.ts`.
- Use default exports for Nuxt entry points and module hooks, such as route handlers in `server/api/` and `shared/contentRedirectsModule.ts`.

**Barrel Files:**

- No barrel/index export pattern is detected for application utilities or components. Import from the defining file.
- Use Nuxt auto-imports for components and composables where the framework provides them; avoid adding a new barrel solely for convenience.

---

*Convention analysis: 2026-09-15*
