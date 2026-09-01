---
last_mapped_commit: 406253b1b73b8ef1369805abfcfd98a6f3adb0d1
---

<!-- refreshed: 2026-09-01 -->
# Coding Conventions

**Analysis Date:** 2026-09-01

## Naming Patterns

**Files:**
- Use Nuxt file-based names for routes, including `[...slug].vue` and `blog/[[slug]].vue` in `app/pages/`.
- Use PascalCase for Vue components (`app/components/CommunityMap.vue`) and camelCase for TypeScript utilities (`app/utils/communityMap.ts`, `shared/blogArticlesTransformer.ts`).
- Keep content slugs lowercase and hyphenated; blog articles use the `YYYYMMDD.slug.md` form under `content/blog-articles/`.

**Functions:**
- Use camelCase, with `use` prefixes for composables (`useDataCommunities` in `app/composables/content.ts`) and `project`/`parse`/`get` prefixes for pure transformations and accessors.
- Use descriptive predicate names such as `isRecord`, `isPortalEvent`, and `isPortalWebhookSignatureValid` in `server/utils/portalEvents.ts` and `server/api/events/webhook.post.ts`.

**Variables:**
- Use camelCase for locals and reactive state (`activeMarker`, `mapContainerHeight` in `app/components/CommunityMap.vue`).
- Preserve external/content field names where they are part of the schema (`portal_meetup_id`, `redirect_from` in `content.config.ts`).

**Types:**
- Use PascalCase interfaces and type aliases (`PortalEvent`, `CalendarEventRow`, `PageResult`).
- Prefer explicit discriminated unions for route results, as in `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue`.
- Use `as const satisfies` for immutable typed data, as in `shared/data/partners.ts`.

## Code Style

**Formatting:**
- No repository formatter configuration is detected. Match the existing TypeScript style: single quotes, two-space indentation, semicolon-free statements, trailing commas in multiline literals, and braces on the same line.
- Use multiline arrow functions and early returns for non-trivial logic, as in `projectCommunities` in `app/composables/content.ts`.
- Vue templates use Nuxt UI primitives and Tailwind utility classes; keep component-specific CSS scoped, as in `app/components/CommunityMap.vue`.

**Linting:**
- No ESLint, Prettier, or Biome configuration is detected. `npm run typecheck` is the available static correctness check.

## Import Organization

**Order:**
1. External packages and type-only package imports.
2. Shared aliases such as `#shared` and `~/`.
3. Relative server/shared imports.

Keep type-only imports explicit (`import type`) and rely on Nuxt auto-imports for framework composables (`useRoute`, `useAsyncData`, `createError`, and `computed`).

**Path Aliases:**
- Use `~/` for app-local modules, `#shared` for shared modules, and relative imports in server files where the current code does so (`server/api/events/index.get.ts`).

## Error Handling

**Patterns:**
- Throw `createError` for route/API responses and include a status code and safe status message (`server/api/events/index.get.ts`, `app/pages/[...slug].vue`).
- Use a domain error with `statusCode` when a server integration needs to preserve expected HTTP semantics (`PortalEventsError` in `server/utils/portalEvents.ts`).
- Validate unknown external data with narrowing helpers before reading fields; do not trust Portal or cache payloads (`isRecord`, `parseEvent`, and `parseCache` in `server/utils/portalEvents.ts`).
- Catch transport failures at the integration boundary and avoid exposing details outside development (`server/api/events/index.get.ts`).

## Logging

**Framework:** `console.error` at the API boundary; no application logging framework is detected.

**Patterns:**
- Log failed Portal requests once in `server/api/events/index.get.ts` and return a generic production message.
- Do not add logging to pure projection functions such as `app/utils/calendar.ts`.

## Comments

**When to Comment:**
- Comment non-obvious framework boundaries, security behavior, timezone handling, and data normalization. Examples include `app/utils/calendar.ts` and `server/api/events/webhook.post.ts`.
- Keep comments current and specific; ordinary control flow does not need narration.

**JSDoc/TSDoc:**
- Short `/** ... */` comments document exported helpers and security-sensitive functions in `server/utils/portalEvents.ts` and `server/api/events/webhook.post.ts`.
- Inline comments explain deployment/browser constraints in `nuxt.config.ts` and `app/components/CommunityMap.vue`.

## Function Design

**Size:**
- Keep pure helpers focused and composable (`projectCalendarEvents`, `eventJsonLd`, and `clampCommunityMapTransform`). Complex interaction state may remain local to its owning component (`app/components/CommunityMap.vue`).

**Parameters:**
- Accept `readonly` arrays for functions that do not mutate callers (`projectCalendarEvents` and `projectCommunities`).
- Inject storage, fetch, and time dependencies at server integration boundaries to keep behavior deterministic and testable (`getPortalEvents` in `server/utils/portalEvents.ts`).

**Return Values:**
- Return precise interfaces or discriminated unions. Use `undefined` for omitted optional metadata and `null` for an explicit empty value, following `PortalEvent` and `CalendarEventRow`.
- Do not mutate caller-owned arrays; copy before sorting (`events.slice().sort(...)` in `app/utils/calendar.ts`).

## Module Design

**Exports:**
- Export reusable pure helpers and domain types from focused modules; keep implementation-only parsers private (`server/utils/portalEvents.ts`).
- Vue components expose behavior through props and slots, with `defineProps` in `<script setup>` (`app/components/page/Community.vue`).

**Barrel Files:**
- No barrel/index export pattern is detected. Import modules directly from their owning paths.

## Content and UI Rules

- Define frontmatter schemas in `content.config.ts`; use generated Nuxt Content item types in Vue components.
- Order blog content by `id`, not a separately parsed date (`app/components/page/BlogCategory.vue`).
- Prefer Nuxt UI components (`UButton`, `UAlert`, `UAccordion`, `UNavigationMenu`) over bespoke controls, as shown in `app/components/content/Calendar.vue` and `app/components/app/NavMenu.vue`.
- Preserve Czech locale and metadata conventions from `app/app.vue` and `app/app.config.ts`.

---

*Convention analysis: 2026-09-01*
