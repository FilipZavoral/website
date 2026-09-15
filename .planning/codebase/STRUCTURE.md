---
last_mapped_commit: 599ee9aa4c15c119dae17486c0f6ea5999b32b9e
last_mapped_at: 2026-09-15
---
# Codebase Structure

**Analysis Date:** 2026-09-15

## Directory Layout

```text
jednadvacet-org/
├── app/                         # Nuxt application shell, routes, layouts, UI
│   ├── components/              # Reusable and domain-specific Vue components
│   ├── composables/             # Content query and projection composables
│   ├── layouts/                 # Shared page shells
│   ├── pages/                   # File-based routes
│   ├── plugins/                 # Client-side Nuxt plugins
│   ├── utils/                   # Browser-safe feature helpers
│   └── assets/css/              # Main Tailwind/Nuxt UI stylesheet
├── content/                     # Markdown collections and frontmatter
│   ├── blog-articles/
│   ├── blog-categories/
│   ├── communities/
│   ├── pages/
│   └── people/
├── server/                      # Nitro API, routes, middleware, tasks, services
│   ├── api/
│   ├── middleware/
│   ├── plugins/
│   ├── routes/
│   ├── tasks/
│   └── utils/
├── shared/                      # Client/server data, types, and Nuxt modules
│   ├── data/
│   └── types/
├── public/                      # Static images, icons, manifests, and well-known files
├── scripts/                     # Build-time validation scripts
├── tests/                       # Node test-runner tests for domain and route behavior
├── content.config.ts            # Nuxt Content collection definitions
├── nuxt.config.ts               # Modules, runtime, storage, queues, deployment
├── package.json                 # npm scripts and dependencies
└── tsconfig.json                # Generated/project TypeScript configuration entry
```

## Directory Purposes

**`app/pages/`:**

- Purpose: Define public file-based routes.
- Contains: `app/pages/[...slug].vue` for root content/community paths, `app/pages/blog/[[slug]].vue` for blog index/category/article paths, and `app/pages/lide.vue` for people.
- Key files: `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue`, `app/pages/lide.vue`.

**`app/components/`:**

- Purpose: Render the application shell and feature UI.
- Contains: Top-level feature components, `app/` shell components, `content/` MDC components, and `page/` content views.
- Key files: `app/components/app/NavBar.vue`, `app/components/app/NavMenu.vue`, `app/components/page/Community.vue`, `app/components/content/Calendar.vue`.

**`app/composables/`:**

- Purpose: Reuse Nuxt Content queries and pure content projections.
- Contains: `app/composables/content.ts` with category/community loading, grouping, and prioritization.
- Key files: `app/composables/content.ts`.

**`app/layouts/`:**

- Purpose: Wrap route content with common navigation, main content, footer, or wallpaper presentation.
- Contains: `app/layouts/default.vue` and `app/layouts/wallpaper.vue`.
- Key files: `app/layouts/default.vue`, `app/layouts/wallpaper.vue`.

**`app/plugins/`:**

- Purpose: Register browser-side integrations.
- Contains: `app/plugins/counterscale.client.ts`, a client-only analytics plugin exposing `$counterscale`.

**`app/utils/`:**

- Purpose: Keep browser-safe domain formatting and interaction helpers outside components.
- Contains: Calendar event projection/JSON-LD helpers in `app/utils/calendar.ts` and map coordinate/transform helpers in `app/utils/communityMap.ts`.

**`content/`:**

- Purpose: Store published Markdown/MDC records consumed by typed Nuxt Content collections.
- Contains: Date-prefixed blog articles, blog categories, root-routed pages and communities, and non-routed people profiles.
- Key files: `content.config.ts`, `content/pages/index.md`, `content/blog-articles/20230816.bolt-karta-s-lnbits.md`, `content/communities/pribram.md`.
- Routing rule: Blog records use `/blog`; pages and communities use `/`; people have no standalone public route.

**`server/api/`:**

- Purpose: Expose Nitro API endpoints.
- Contains: `server/api/events/`, `server/api/community-maps/`, and `server/api/miners.get.ts`.
- Key files: `server/api/events/index.get.ts`, `server/api/events/webhook.post.ts`, `server/api/events/refresh.post.ts`.

**`server/routes/`:**

- Purpose: Expose non-`/api` server routes.
- Contains: `server/routes/ical/[slug].get.ts` for public iCalendar feeds.

**`server/middleware/`:**

- Purpose: Handle request paths that are not ordinary API handlers.
- Contains: `server/middleware/rss-feed.ts` for RSS feed responses.

**`server/tasks/`:**

- Purpose: Define Nitro scheduled/manual background tasks.
- Contains: `server/tasks/portal-events.ts` and `server/tasks/community-maps.ts`, which enqueue refresh work.

**`server/plugins/`:**

- Purpose: Consume Cloudflare queue batches through Nitro hooks.
- Contains: `server/plugins/portalEventsQueue.ts` and `server/plugins/communityMapsQueue.ts`.

**`server/utils/`:**

- Purpose: Hold server-only integration and domain logic shared by handlers, tasks, and queue consumers.
- Contains: Portal snapshot processing, Google Calendar synchronization, static map generation, miners retrieval, iCal projection, and token validation.
- Key files: `server/utils/portalEvents.ts`, `server/utils/googleCalendar.ts`, `server/utils/staticMap.ts`, `server/utils/eventsAdminAuth.ts`.

**`shared/data/`:**

- Purpose: Store data imported by both client and server code.
- Contains: `navigation.ts`, `partners.ts`, `communityMapGeometry.json`, and `contentRouteSources.ts`.

**`shared/types/`:**

- Purpose: Share narrow data contracts across app and server boundaries.
- Contains: `shared/types/portalEvents.ts` and `shared/types/miners.ts`.

**`public/`:**

- Purpose: Serve immutable static assets directly.
- Contains: `public/images/blog/`, `public/images/avatars/`, `public/images/partners/`, `public/images/app/`, `public/icons/`, and `public/.well-known/lnurlp/donate`.

**`tests/`:**

- Purpose: Exercise pure domain logic and public boundary behavior with Node's test runner.
- Contains: Calendar projection, Portal event/webhook/queue behavior, miners, community maps, and route validation tests.
- Key files: `tests/portalEvents.test.ts`, `tests/portalWebhook.test.ts`, `tests/publicCalendar.test.ts`, `tests/validateContentRoutes.test.ts`.

## Key File Locations

**Entry Points:**

- `app/app.vue`: Global application shell and document head.
- `app/pages/[...slug].vue`: Root page/community route.
- `app/pages/blog/[[slug]].vue`: Blog route dispatcher.
- `server/api/events/index.get.ts`: Public event API.
- `server/routes/ical/[slug].get.ts`: Public calendar feed.

**Configuration:**

- `nuxt.config.ts`: Modules, aliases, runtime config, Cloudflare preset, storage, queues, cron schedules, sitemap, image, and Studio configuration.
- `content.config.ts`: Collections, frontmatter schemas, source prefixes, indexes, and sitemap filters.
- `package.json`: npm scripts, runtime dependencies, and test command.
- `app/app.config.ts`: Nuxt UI/application configuration.

**Core Logic:**

- `server/utils/portalEvents.ts`: Portal parsing, cache validation, refresh, and public snapshot reads.
- `server/utils/googleCalendar.ts`: OAuth token exchange and owned-event synchronization.
- `app/composables/content.ts`: Shared content queries and community projection.
- `shared/data/contentRouteSources.ts`: Canonical routed collection directories and prefixes.

**Testing:**

- `tests/`: Focused Node tests for pure helpers and integration boundaries.
- `package.json`: `npm test` runs `node --experimental-strip-types --test tests/*.test.ts`.

## Naming Conventions

**Files:**

- Vue components use PascalCase, for example `app/components/CommunityMap.vue` and `app/components/page/BlogArticle.vue`.
- Composables use camelCase filenames and `use*` exports, for example `app/composables/content.ts`.
- Nitro handlers use route suffixes such as `.get.ts` and `.post.ts`, for example `server/api/events/index.get.ts`.
- Content files use lowercase slugs; blog articles begin with `YYYYMMDD.`, for example `content/blog-articles/20230816.bolt-karta-s-lnbits.md`.
- Shared domain helpers use descriptive camelCase names, for example `shared/blogArticlesTransformer.ts`.

**Directories:**

- Nuxt convention directories are lowercase: `pages`, `layouts`, `plugins`, `composables`, `api`, `routes`, `tasks`, and `utils`.
- Components are grouped by responsibility under `app/components/app/`, `app/components/content/`, and `app/components/page/`.
- Dynamic route segments use Nuxt bracket notation, such as `app/pages/[...slug].vue` and `server/routes/ical/[slug].get.ts`.

## Where to Add New Code

**New Feature:**

- Route entry: Add or extend a file under `app/pages/`; use existing catch-all route dispatch when the feature is content-backed.
- Presentation: Add the smallest suitable component under `app/components/`, preferring `app/components/page/` for page views and `app/components/content/` for Markdown/MDC components.
- Server behavior: Add a thin handler under `server/api/` or `server/routes/`, with reusable integration logic in `server/utils/`.
- Tests: Add focused behavior tests under `tests/` using the existing Node test runner.

**New Content Collection:**

- Schema and source: Update `content.config.ts`.
- Route metadata: Update `shared/data/contentRouteSources.ts` when the collection is public-routed.
- Consumer: Add query/rendering logic in `app/pages/`, `app/composables/`, or `app/components/`.
- Collision protection: Extend `scripts/validate-content-routes.ts` and its test if routing behavior changes.

**New Component/Module:**

- Implementation: Put reusable Vue UI in `app/components/`; put a Nuxt module or build hook in `shared/` only when it is a framework boundary, as with `shared/contentRedirectsModule.ts`.
- Content renderer override: Use `app/components/content/` and configure aliases in `nuxt.config.ts`.

**Utilities:**

- Browser-safe helpers: `app/utils/`.
- Server-only helpers and external API logic: `server/utils/`.
- Shared client/server types: `shared/types/`.
- Shared static data: `shared/data/`.

## Special Directories

**`.nuxt/`, `.output/`, `.data/`, `node_modules/`:**

- Purpose: Generated Nuxt/build/dependency/runtime data.
- Generated: Yes.
- Committed: No; treat these as diagnostic or build output rather than source.

**`public/`:**

- Purpose: Directly served static assets.
- Generated: No for repository-managed images/icons; generated map files are produced into configured blob storage rather than committed here.
- Committed: Yes for checked-in site assets.

**`.planning/`:**

- Purpose: GSD planning and codebase mapping artifacts.
- Generated: Yes by workflow tooling.
- Committed: Repository workflow may commit selected planning artifacts; application source must not import from it.

---

*Structure analysis: 2026-09-15*
