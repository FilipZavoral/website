---
last_mapped_commit: 599ee9aa4c15c119dae17486c0f6ea5999b32b9e
last_mapped_at: 2026-09-15
---
<!-- refreshed: 2026-09-15 -->

# Architecture

**Analysis Date:** 2026-09-15

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Nuxt 4 SSR application                    │
│                      `app/app.vue`                           │
├──────────────────┬──────────────────┬───────────────────────┤
│ File routes      │ Content UI        │ Server/Nitro API       │
│ `app/pages/`     │ `app/components/` │ `server/`              │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Typed Nuxt Content collections and shared application data    │
│ `content.config.ts`, `content/`, `shared/data/`, `shared/`    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Nuxt Content SQLite/D1, Nitro storage, Cloudflare services    │
│ `nuxt.config.ts`, Portal API, KV, R2, Queues, Google API      │
└─────────────────────────────────────────────────────────────┘
```

The repository contains one Nuxt 4 application using Vue 3, TypeScript, Nuxt Content, Nuxt UI, NuxtHub, and Nitro. Browser requests are SSR-rendered through `app/app.vue`; Cloudflare Workers is the production Nitro preset configured in `nuxt.config.ts`.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Application shell | Sets document head, locale, `UApp`, layout, route announcer, and page rendering | `app/app.vue` |
| File-based route resolution | Selects content pages/communities and blog index/categories/articles | `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue` |
| Content schema | Defines typed collections, source directories, public prefixes, and validation | `content.config.ts` |
| Page presentation | Renders typed content and domain-specific landing pages | `app/components/page/BlogArticle.vue`, `app/components/page/BlogCategory.vue`, `app/components/page/Community.vue` |
| Shared navigation | Combines static navigation with content-derived cities and categories | `app/components/app/NavMenu.vue`, `shared/data/navigation.ts` |
| Public API | Exposes event, miner, map, webhook, refresh, and iCal endpoints | `server/api/`, `server/routes/ical/[slug].get.ts` |
| Background processing | Runs scheduled tasks and Cloudflare queue consumers | `server/tasks/`, `server/plugins/` |
| Domain services | Fetches, validates, snapshots, projects, and synchronizes external data | `server/utils/` |

## Pattern Overview

**Overall:** Content-driven SSR with Nuxt file routing, typed collection queries, and Nitro service endpoints.

**Key Characteristics:**

- Markdown collections are the source of truth for public pages, communities, blog content, and people.
- `app/pages/` resolves routes while reusable presentation belongs in `app/components/`.
- Server-side external integrations are isolated in `server/utils/` and exposed through thin `server/api/` or `server/routes/` handlers.
- Durable event snapshots are read by public requests; refreshes happen in scheduled tasks and queue consumers.
- Cloudflare-specific bindings are selected in `nuxt.config.ts` while local development uses filesystem or memory drivers.

## Layers

**Application shell and layouts:**

- Purpose: Provide global head metadata, accessibility announcements, navigation, page container, and footer.
- Location: `app/app.vue`, `app/layouts/`, `app/components/app/`
- Contains: `UApp`, `NuxtLayout`, `NuxtPage`, header/footer, wallpaper layout.
- Depends on: Nuxt UI and shared navigation data.
- Used by: Every page route.

**Route and content query layer:**

- Purpose: Map URLs to typed content collections and choose the correct content view.
- Location: `app/pages/`, `app/composables/content.ts`, `content.config.ts`
- Contains: Catch-all root routes, optional blog slug route, collection query helpers, collection schemas.
- Depends on: Generated Nuxt Content types and filesystem-backed content.
- Used by: Pages, navigation, maps, people blocks, and background tasks.

**Presentation layer:**

- Purpose: Render content and feature UI using Nuxt UI primitives.
- Location: `app/components/`
- Contains: Page views, navigation, blog cards, community map, calendar, donation, partner, and content renderer components.
- Depends on: Typed collection records, shared types/data, `useFetch`, `useAsyncData`, and Nuxt UI.
- Used by: Route pages and Markdown/MDC rendering.

**Server HTTP layer:**

- Purpose: Validate requests and translate them into domain-service calls.
- Location: `server/api/`, `server/routes/`, `server/middleware/`
- Contains: Events API, signed Portal webhook, admin refresh routes, miner/map endpoints, iCal feed, and RSS middleware.
- Depends on: H3, Nitro storage/tasks, Cloudflare bindings, and `server/utils/`.
- Used by: Browser components, Portal callbacks, scheduled operations, and calendar clients.

**Domain and integration layer:**

- Purpose: Encapsulate external API parsing, snapshot rules, calendar projection, static map generation, and auth checks.
- Location: `server/utils/`
- Contains: `portalEvents.ts`, `googleCalendar.ts`, `calendarEventProjection.ts`, `staticMap.ts`, `miners.ts`, and queue/auth helpers.
- Depends on: Web Crypto, Fetch, Nitro storage, and external Portal/Google/Mapbox services.
- Used by: HTTP handlers, queue consumers, and tasks.

**Shared data and types:**

- Purpose: Keep route source metadata, navigation, geometry, partners, and server/client contracts in one importable layer.
- Location: `shared/`
- Contains: `shared/data/`, `shared/types/`, transformers, and the content redirect module.
- Depends on: Nuxt Content or Nuxt Kit only where needed.
- Used by: Both `app/` and `server/`.

## Data Flow

### Primary Content Request Path

1. Nuxt enters `app/app.vue`, installs global head metadata and renders `NuxtLayout`/`NuxtPage`.
2. A root URL enters `app/pages/[...slug].vue`, which queries `pages` and then `communities` by `route.path`.
3. A `/blog` URL enters `app/pages/blog/[[slug]].vue`, which selects the blog index, `blogCategories`, or `blogArticles` collection.
4. The selected record is passed to `ContentRenderer`, `PageCommunity`, `PageBlogCategory`, or `PageBlogArticle`.
5. Nuxt Content renders Markdown/MDC; `nuxt.config.ts` aliases the table renderer to `ProseScrollableTable` and applies the blog transformer.

### Community Calendar Path

1. `app/components/content/Calendar.vue` calls `/api/events?community=...` with `useFetch`.
2. `server/api/events/index.get.ts` validates the slug and reads `useStorage('portalEvents')` through `getPortalEvents()` in `server/utils/portalEvents.ts`.
3. The browser projects and filters normalized events in `app/utils/calendar.ts` and renders them with Nuxt UI.
4. `/ical/[slug]` uses the same snapshots through `server/routes/ical/[slug].get.ts` and serializes standards-compliant iCalendar output.

### Portal Refresh Path

1. Portal sends a signed callback to `server/api/events/webhook.post.ts`, which verifies timestamp, HMAC, payload, and identifiers.
2. The handler sends a typed message to the `PORTAL_EVENTS_QUEUE` Cloudflare binding.
3. `server/plugins/portalEventsQueue.ts` selects affected content communities, calls `refreshPortalMeetups()`, and writes snapshots to the `portalEvents` Nitro storage mount.
4. Full refreshes reconcile Google Calendar; targeted event changes synchronize affected Google events.
5. Scheduled `server/tasks/portal-events.ts` sends a `refresh-all` message; `server/api/events/refresh.post.ts` provides the authenticated admin trigger.

### Community Map Path

1. `server/tasks/community-maps.ts` queries visible communities with coordinates and batches map sources to the `COMMUNITY_MAPS_QUEUE` binding.
2. `server/plugins/communityMapsQueue.ts` calls `generateCommunityMaps()` in `server/utils/staticMap.ts` and writes generated variants through `hub:blob`.
3. `app/components/page/Community.vue` reads local development map endpoints or the public R2 CDN URL for production.

**State Management:**

- Request state uses Nuxt payload-aware `useAsyncData` and `useFetch`.
- Content state is read from Nuxt Content collections and is not mutated in the client.
- Interactive state such as map transforms, calendar filters, pagination, and modal visibility is local component state.
- External event state is materialized in Nitro storage and updated asynchronously through queues.

## Key Abstractions

**Routed content collections:**

- Purpose: Keep content directory names and public URL prefixes synchronized.
- Examples: `content.config.ts`, `shared/data/contentRouteSources.ts`
- Pattern: Both collection schemas and the route validator consume `routedContentSources`; root pages and communities intentionally share `/`.

**Typed content projections:**

- Purpose: Convert collection records into UI-ready groupings without coupling components to query details.
- Examples: `app/composables/content.ts`, `app/utils/communityMap.ts`
- Pattern: Query helpers return async data; pure projection functions such as `projectCommunities()` handle sorting/grouping.

**Portal event snapshots:**

- Purpose: Decouple public reads from Portal availability and preserve cancellation/revision semantics.
- Examples: `server/utils/portalEvents.ts`, `server/api/events/index.get.ts`
- Pattern: Parse untrusted upstream rows, validate cache schemas, write durable snapshots, then serve only validated snapshot-derived data.

**Queue message contracts:**

- Purpose: Define safe boundaries between HTTP/scheduled producers and Cloudflare consumers.
- Examples: `server/utils/portalEventsQueue.ts`, `server/tasks/community-maps.ts`
- Pattern: Use discriminated message shapes and explicit runtime parsing before processing.

## Entry Points

**Nuxt application:**

- Location: `app/app.vue`
- Triggers: Every SSR or client route request.
- Responsibilities: Global document head, Czech UI locale, layout selection, route announcement, and page rendering.

**Content routes:**

- Location: `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue`, `app/pages/lide.vue`
- Triggers: Public page, blog, and people URLs.
- Responsibilities: Query collections, select views, emit 404 errors, and set page-level metadata.

**Nitro HTTP routes:**

- Location: `server/api/`, `server/routes/`, `server/middleware/rss-feed.ts`
- Triggers: Browser fetches, Portal webhooks, admin calls, iCalendar clients, and feed requests.
- Responsibilities: Validate inputs, call domain services, set response status/headers, and map failures to HTTP errors.

**Background entry points:**

- Location: `server/tasks/`, `server/plugins/`
- Triggers: Cloudflare cron schedules and queue deliveries configured in `nuxt.config.ts`.
- Responsibilities: Enqueue map/event work and process queue batches.

## Architectural Constraints

- **Runtime:** Production uses the Cloudflare Workers `cloudflare_module` Nitro preset; use Web APIs and Cloudflare-compatible storage rather than Node-only APIs.
- **Rendering:** The application is SSR-first; use Nuxt payload-aware data fetching and keep browser-only APIs behind client lifecycle checks.
- **Content routing:** `pages` and `communities` share root paths, while blog categories/articles share `/blog`; preserve `shared/data/contentRouteSources.ts` and route validation.
- **Storage:** Portal events use the `portalEvents` Nitro storage mount; production maps it to Cloudflare KV and previews use isolated in-memory storage.
- **External integrations:** Portal webhooks must be verified before queueing; public handlers must not directly trust upstream payloads.
- **Global state:** Module-level constants and pure helpers exist in `server/utils/portalEvents.ts`; mutable UI state stays inside components.
- **Circular imports:** No intentional circular dependency chain is detected; keep shared contracts below app/server consumers.

## Anti-Patterns

### Direct upstream event reads from public UI

**What happens:** A public component calls Portal directly or bypasses `server/utils/portalEvents.ts` snapshots.
**Why it's wrong:** It couples rendering to upstream latency/availability and bypasses validation and cancellation handling.
**Do this instead:** Call `server/api/events/index.get.ts`, which reads durable snapshots through `getPortalEvents()`.

### Adding a new root route without collection collision validation

**What happens:** A new page or community filename introduces a duplicate public path.
**Why it's wrong:** Both collections use the root URL space and route selection becomes ambiguous.
**Do this instead:** Update `content.config.ts` and `shared/data/contentRouteSources.ts` consistently and run `scripts/validate-content-routes.ts`.

## Error Handling

**Strategy:** Validate at boundaries, use typed domain errors, and translate failures into safe H3 responses.

**Patterns:**

- Content misses throw fatal 404 errors in `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue`.
- API handlers use `createError()` and hide upstream details outside development, as in `server/api/events/index.get.ts`.
- Queue consumers log structured context and rethrow so Cloudflare retry behavior remains active.
- External content is parsed and schema-checked before persistence in `server/utils/portalEvents.ts`.

## Cross-Cutting Concerns

**Logging:** `console.info`, `console.warn`, and `console.error` are used in server tasks, queue consumers, and integration boundaries; Cloudflare observability is configured in `nuxt.config.ts`.

**Validation:** Zod schemas validate Markdown frontmatter in `content.config.ts`; server handlers use explicit type guards and regex/range checks; tests in `tests/` cover domain boundaries.

**Authentication:** Admin event refresh uses `NUXT_EVENTS_ADMIN_TOKEN` through `server/utils/eventsAdminAuth.ts`; Portal callbacks use HMAC verification in `server/api/events/webhook.post.ts`; Google synchronization uses runtime OAuth configuration in `server/utils/googleCalendar.ts`.

**SEO and metadata:** Global canonical/head behavior is in `app/app.vue`; page-specific metadata is colocated with route/view components; sitemap behavior is configured in `nuxt.config.ts` and `content.config.ts`.

---

*Architecture analysis: 2026-09-15*
