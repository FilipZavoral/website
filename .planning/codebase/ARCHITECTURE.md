---
last_mapped_commit: 406253b1b73b8ef1369805abfcfd98a6f3adb0d1
---

# Architecture

<!-- refreshed: 2026-09-01 -->

**Analysis Date:** 2026-09-01

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│ Nuxt 4 application shell                                    │
│ `app/app.vue`, layouts, Nuxt UI components                   │
└───────────────┬───────────────────────┬─────────────────────┘
                │                       │
                ▼                       ▼
┌───────────────────────────┐  ┌─────────────────────────────┐
│ File-based route adapters  │  │ Server event adapters       │
│ `app/pages/`               │  │ `server/api/events/`        │
└──────────────┬────────────┘  └──────────────┬──────────────┘
               │                              │
               ▼                              ▼
┌───────────────────────────┐  ┌─────────────────────────────┐
│ Typed Nuxt Content         │  │ Portal normalization/cache   │
│ `content.config.ts`        │  │ `server/utils/portalEvents.ts`│
└──────────────┬────────────┘  └──────────────┬──────────────┘
               │                              │
               ▼                              ▼
┌───────────────────────────┐  ┌─────────────────────────────┐
│ Markdown and static assets │  │ Cloudflare KV / external API │
│ `content/`, `public/`      │  │ D1-backed Content, Portal     │
└───────────────────────────┘  └─────────────────────────────┘
```

The application is a content-driven Nuxt SSR site with a small server integration boundary. Markdown collections provide most page data; Vue route and display components provide presentation and interactive behavior. Nitro targets Cloudflare Workers and supplies the event API, storage abstraction, and deployment bindings.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| App shell | Locale, global head, layout and page mounting | `app/app.vue` |
| Site frame | Header, main slot and footer | `app/layouts/default.vue` |
| Content route adapter | Resolves pages and communities in shared root URL space | `app/pages/[...slug].vue` |
| Blog route adapter | Resolves blog index, category, or article | `app/pages/blog/[[slug]].vue` |
| Content model | Defines typed collections and frontmatter validation | `content.config.ts` |
| Blog/article presentation | Renders article metadata, body, TOC and authors | `app/components/page/BlogArticle.vue` |
| Community presentation | Renders community content, Signal link, organizers and calendar | `app/components/page/Community.vue` |
| Portal adapter | Validates, normalizes, filters, caches and refreshes events | `server/utils/portalEvents.ts` |
| Event API | Validates query input and maps adapter failures to HTTP errors | `server/api/events/index.get.ts` |
| Webhook API | Authenticates Portal notifications and refreshes affected cache | `server/api/events/webhook.post.ts` |

## Pattern Overview

**Overall:** File-based Nuxt routing over typed, filesystem-backed content with server-side integration adapters.

**Key Characteristics:**
- Use Nuxt Content collection queries as the primary read model; generated item types cross the route-to-component boundary.
- Keep public page and community routes in one root namespace, with explicit `/blog` routing taking precedence.
- Keep external Portal data behind `server/utils/portalEvents.ts`; expose only normalized events to browser components.
- Use Nuxt UI primitives for the site frame and content presentation, while specialized behavior remains local to components such as `app/components/CommunityMap.vue`.

## Layers

**Application shell and layouts:**
- Purpose: Establish locale, head defaults, navigation, footer and error framing.
- Location: `app/app.vue`, `app/layouts/`, `app/error.vue`.
- Contains: `UApp`, `UHeader`, `UMain`, `UFooter`, and layout slots.
- Depends on: Nuxt runtime and Nuxt UI.
- Used by: Every routed page.

**Route adapters:**
- Purpose: Translate URL paths into collection records and select the appropriate renderer.
- Location: `app/pages/`.
- Contains: Explicit people route, blog optional catch-all, and generic catch-all.
- Depends on: `queryCollection`, `useAsyncData`, generated collection types, page components.
- Used by: Nuxt's file-system router.

**Content model and content extensions:**
- Purpose: Define schemas, source directories, public prefixes, date transformation and redirects.
- Location: `content.config.ts`, `shared/contentRouteSources.ts`, `shared/blogArticlesTransformer.ts`, `shared/contentRedirectsModule.ts`.
- Contains: Five collections, shared route-source constants, a filename transformer and a route-rule module.
- Depends on: Nuxt Content and Nuxt Kit.
- Used by: Build-time indexing and route adapters.

**Presentation and client behavior:**
- Purpose: Render Markdown records and provide navigation, maps, donation QR codes, social links and calendar UI.
- Location: `app/components/`, `app/composables/content.ts`, `app/utils/`.
- Contains: Page components, app components, content components, pure projections and client composables.
- Depends on: Nuxt UI, Nuxt Content, VueUse and shared types.
- Used by: Markdown MDC and route components.

**Server integration:**
- Purpose: Serve event data, validate webhook requests and persist refreshable event snapshots.
- Location: `server/api/events/`, `server/utils/portalEvents.ts`.
- Contains: GET and POST handlers plus pure Portal parsing/cache orchestration.
- Depends on: H3, Nuxt Content server querying, `$fetch`, Nitro storage and runtime config.
- Used by: `app/components/content/Calendar.vue` and Portal webhook callers.

## Data Flow

### Primary Content Request Path

1. Nuxt mounts `app/app.vue`, which selects a layout and page component.
2. `app/pages/blog/[[slug]].vue` handles `/blog` paths; `app/pages/[...slug].vue` handles other content paths.
3. The route adapter queries the matching typed collection with `queryCollection(...).path(...).first()`.
4. Page records render through `ContentRenderer`; blog and community records delegate to `app/components/page/`.
5. MDC component names in Markdown resolve to auto-imported components such as `HomepageHero`, `Calendar`, `PartnersList` and `DonateBlock`.

### Portal Calendar Path

1. `app/components/content/Calendar.vue` requests `/api/events?community=...` with `useFetch`.
2. `server/api/events/index.get.ts` validates the community slug and loads configured communities from the `communities` collection.
3. `server/utils/portalEvents.ts` reads a per-community Nitro storage cache, refreshes stale/missing snapshots from Portal, and normalizes untrusted fields.
4. The API returns `PortalEvent[]`; the client projects rows with `app/utils/calendar.ts` and emits Event JSON-LD.
5. `server/api/events/webhook.post.ts` verifies timestamped HMAC signatures and refreshes the matching community cache after Portal changes.

**State Management:** Content is fetched through SSR-aware `useAsyncData`/`useFetch`. Component-local interaction state uses Vue `ref`, `reactive`, `computed` and `watch`; durable event state is stored through Nitro storage (`portalEvents`), backed by filesystem storage in development, memory in preview, and Cloudflare KV in production.

## Key Abstractions

**Routed content source map:** `shared/data/contentRouteSources.ts` is the single source for collection directories and URL prefixes. `content.config.ts` and `scripts/validate-content-routes.ts` both consume it; preserve it when adding routed collections.

**Typed collection items:** `content.config.ts` generates collection item types consumed by `app/pages/` and `app/components/page/`. Keep schema changes at the collection boundary rather than duplicating record interfaces in components.

**Portal adapter contracts:** `PortalCommunity`, `PortalStorage`, `PortalFetch` and `PortalEventsError` in `server/utils/portalEvents.ts` isolate external I/O from normalization and make the adapter testable with in-memory storage and fetch doubles.

**Pure projections:** `projectCalendarEvents`/`eventJsonLd` in `app/utils/calendar.ts`, `projectCommunityCoordinate` in `app/utils/communityMap.ts`, and `projectCommunities` in `app/composables/content.ts` keep derived display data separate from templates.

## Entry Points

**Browser application:**
- Location: `app/app.vue`.
- Triggers: Nuxt SSR request or client navigation.
- Responsibilities: Global locale, canonical link, title template, layout and page mounting.

**Content routes:**
- Locations: `app/pages/blog/[[slug]].vue`, `app/pages/[...slug].vue`, `app/pages/lide.vue`.
- Triggers: `/blog/**`, root content paths, and `/lide`.
- Responsibilities: Query content, select renderers and produce fatal 404 errors for missing records.

**HTTP API:**
- Locations: `server/api/events/index.get.ts`, `server/api/events/webhook.post.ts`.
- Triggers: Calendar browser fetches and signed Portal webhooks.
- Responsibilities: Public event reads, cache refresh, webhook authentication and safe error translation.

**Build/runtime configuration:**
- Location: `nuxt.config.ts`.
- Triggers: Nuxt prepare, dev, build and Cloudflare deployment.
- Responsibilities: Module registration, content transformer, redirects, storage bindings, route rules, sitemap exclusions and Cloudflare preset.

## Architectural Constraints

- **Runtime:** Production uses Nitro's `cloudflare_module` preset; avoid Node-only APIs in application runtime code. The route-validation build script is explicitly Node-based.
- **URL space:** `pages` and `communities` share `/`; `/blog` and `/blog/**` are reserved for the explicit blog route. `scripts/validate-content-routes.ts` rejects collisions and reserved root content.
- **Global state:** Module-level `Intl.DateTimeFormat` instances and immutable partner data exist in `app/utils/calendar.ts` and `shared/data/partners.ts`; event cache state is externalized to Nitro storage.
- **Generated types:** `tsconfig.json` references `.nuxt/tsconfig.*.json`; do not hand-edit generated `.nuxt/` output.
- **Content dates:** Blog publication dates come from `YYYYMMDD.` filenames through `shared/blogArticlesTransformer.ts`; order article queries by `id`.

## Anti-Patterns

### Bypassing the Portal adapter

**What happens:** A component or endpoint fetches Portal directly and renders raw upstream fields.
**Why it's wrong:** It bypasses validation, safe-link filtering, cache fallback and Cloudflare-compatible storage handling.
**Do this instead:** Call `/api/events` from the client or extend `server/utils/portalEvents.ts` with a tested adapter operation.

### Adding root content without route validation

**What happens:** A page or community file is added under a path already claimed by another collection or under `/blog`.
**Why it's wrong:** File-system route precedence can make content unreachable or silently select the wrong collection.
**Do this instead:** Keep source prefixes in `shared/data/contentRouteSources.ts` and rely on `scripts/validate-content-routes.ts` in `npm run build`.

## Error Handling

**Strategy:** Route adapters throw fatal Nuxt 404 errors; API handlers validate input and translate expected integration failures to explicit HTTP statuses; the global error page renders branded 404/other-error states.

**Patterns:**
- `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue` throw `createError({ statusCode: 404, fatal: true })` when no record resolves.
- `server/utils/portalEvents.ts` uses `PortalEventsError` for safe upstream/cache failures, while handlers avoid exposing production details.
- `server/api/events/webhook.post.ts` rejects missing credentials, stale signatures, malformed JSON and unknown event envelopes.

## Cross-Cutting Concerns

**Logging:** Standard `console.error` is used for failed Portal requests in `server/api/events/index.get.ts`; Cloudflare observability logs are enabled in `nuxt.config.ts`.

**Validation:** Zod schemas validate content frontmatter in `content.config.ts`; server code narrows external payloads in `server/utils/portalEvents.ts` and webhook code; route collisions are checked by `scripts/validate-content-routes.ts`.

**Authentication:** The only application-owned authenticated flow is HMAC validation for Portal webhooks in `server/api/events/webhook.post.ts`; public content and event reads do not require user sessions.

---

*Architecture analysis: 2026-09-01*

## High-level style

This is a content-driven Nuxt 4 site. The app is mostly a thin rendering layer over typed Nuxt Content collections, with Nuxt UI components providing layout and controls. There is little custom backend logic; the server/runtime responsibilities are handled by Nuxt/Nitro, Nuxt Content, NuxtHub, sitemap generation, and Cloudflare Workers deployment.

Key source anchors:

- Nuxt app shell: `app/app.vue`
- Catch-all content routes: `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue`
- Content schemas: `content.config.ts`
- Content utilities: `app/composables/content.ts`
- Content build/runtime extensions: `shared/blogArticlesTransformer.ts` and `shared/contentRedirectsModule.ts`

## Request and rendering flow

1. `app/app.vue` wraps every route in `<UApp :locale="cs">`, `<NuxtLayout>`, `<NuxtRouteAnnouncer>`, and `<NuxtPage>`.
2. `app/layouts/default.vue` provides the common site frame with app navigation and footer.
3. Page routing is file-system based:
   - `/blog` and `/blog/**` go through `app/pages/blog/[[slug]].vue`.
   - All other non-explicit paths go through `app/pages/[...slug].vue`.
4. Route components use `useAsyncData` and `queryCollection` to resolve the content record for the current path.
5. The resolved content item is rendered with `<ContentRenderer>` and custom collection-specific components.
6. Missing content throws `createError({ statusCode: 404, fatal: true })`, which is displayed by `app/error.vue` inside the `wallpaper` layout.

## Blog routing pattern

`app/pages/blog/[[slug]].vue` models blog routes as a discriminated union:

- `{ type: 'index' }` for `/blog`.
- `{ type: 'category'; category: BlogCategoriesCollectionItem }` if `queryCollection('blogCategories').path(path).first()` matches.
- `{ type: 'article'; article: BlogArticlesCollectionItem }` if `queryCollection('blogArticles').path(path).first()` matches.

The template branches on `result.type` and delegates rendering to page components such as `app/components/page/BlogCategory.vue` and `app/components/page/BlogArticle.vue`.

## Generic page and community routing pattern

`app/pages/[...slug].vue` resolves non-blog routes similarly:

- First tries `queryCollection('pages').path(route.path).first()`.
- Then tries `queryCollection('communities').path(route.path).first()`.
- Renders page content through `<ContentRenderer>` and uses the `page/Community` component when the resolved item is a community.

This means the content collection and path prefix choices in `content.config.ts` are part of the public routing contract.

## Content model and boundaries

`content.config.ts` defines four page-style collections:

- `blogArticles`: Markdown from `content/blog-articles/**`, routed under `/blog`. Schema includes `thumbnail`, `title`, optional `categories`, optional `authors`, optional hidden fields such as `published`, `seo`, `navigation`, `redirect_from`, and sitemap data.
- `blogCategories`: Markdown from `content/blog-categories/**`, routed under `/blog`.
- `communities`: Markdown from `content/communities/**`, routed at root prefix `/`.
- `pages`: Markdown from `content/pages/**`, routed at root prefix `/`.

The route layer imports generated collection item types from `@nuxt/content`, for example `BlogArticlesCollectionItem`, `BlogCategoriesCollectionItem`, `CommunitiesCollectionItem`, and `PagesCollectionItem`.

## Content build extensions

- `shared/blogArticlesTransformer.ts` is registered through `content.build.transformers` in `nuxt.config.ts`. It extracts a publish date from blog article filenames and sets `file.published`. Planning content changes should preserve the `YYYYMMDD.slug.md` naming convention because ordering and dates depend on it.
- `shared/contentRedirectsModule.ts` is registered as a local Nuxt module in `nuxt.config.ts`. It listens to `content:file:afterParse`, reads `redirect_from` and `path`, and calls `extendRouteRules(from, { redirect: { to: path, statusCode: 301 } })`.

## UI component architecture

- App-level components live under `app/components/app/`:
  - `app/components/app/NavBar.vue`
  - `app/components/app/NavMenu.vue`
  - `app/components/app/Footer.vue`
  - `app/components/app/Logo.vue`
  - `app/components/app/SocialMenu.vue`
- Content/page display components live under `app/components/page/`:
  - `app/components/page/BlogArticle.vue`
  - `app/components/page/BlogCategory.vue`
  - `app/components/page/Community.vue`
- Shared content helpers live directly under `app/components/`:
  - `app/components/PersonBlock.vue`
  - `app/components/CategoriesBadges.vue`
  - `app/components/SocialLinks.vue`

The code favors Nuxt UI components over raw HTML controls where possible. Examples include `UNavigationMenu` in `app/components/app/NavMenu.vue`, `ULink` in navigation/social components, and badges/avatars/icons in content metadata components.

## Data access pattern

Reusable content queries are centralized in `app/composables/content.ts`:

- `useDataBlogCategories()` fetches blog categories, orders by `id` ascending, and selects only `path` and `title`.
- `useArticleCategories(categoriesStems?: string[])` filters loaded categories by matching path stems after the `/blog/` prefix.
- `useDataCommunities()` fetches communities and selects `path` and `title`.

For article ordering, project instructions state to use `id` because it contains the date prefix. This matches the repository convention that blog article filenames begin with `YYYYMMDD.` under `content/blog-articles/`.

## Error handling architecture

- Route-level missing content throws fatal Nuxt errors in `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue`.
- `app/error.vue` renders a Czech branded error page using the `wallpaper` layout (`app/layouts/wallpaper.vue`) and custom messaging for 404 versus other errors.
- There is no global application logging/error reporting integration beyond Nuxt's standard behavior and client analytics.

## Runtime/backend boundary

- No application-owned `server/api/` or `server/routes/` files were found.
- `shared/` contains Nuxt/content extensions that run at build/module time, not domain services.
- Database-related packages are installed and NuxtHub DB is configured, but the current app is primarily content-backed rather than API/database-backed.
