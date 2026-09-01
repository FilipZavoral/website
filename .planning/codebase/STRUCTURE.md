---
last_mapped_commit: 406253b1b73b8ef1369805abfcfd98a6f3adb0d1
---

# Codebase Structure

<!-- refreshed: 2026-09-01 -->

**Analysis Date:** 2026-09-01

## Directory Layout

```text
/workspace/
├── app/                     # Nuxt app shell, routes, layouts, components and client utilities
├── content/                 # Nuxt Content Markdown collections
├── public/                  # Static images, logos and partner/blog media
├── server/                  # Nitro API routes and server-only Portal adapter
├── shared/                  # Build extensions, shared data and cross-boundary types
├── scripts/                 # Node build guards
├── tests/                   # Node test-runner tests for pure/server behavior
├── .planning/codebase/      # Architecture and project maps
├── .devcontainer/           # Development container definition
├── .github/                 # Repository metadata
├── content.config.ts        # Content collection schemas and sources
├── nuxt.config.ts           # Nuxt, Nitro, modules and deployment configuration
└── package.json             # npm scripts and dependencies
```

Generated or local-only directories include `node_modules/`, `.nuxt/`, `.output/`, `.data/`, `.wrangler/`, and `.devcontainer/data/`; treat them as build/runtime state rather than source of truth. The ignored legacy path `old.jednadvacet.org/` is separate from the Nuxt application when present.

## Directory Purposes

**`app/`:**
- Purpose: Nuxt 4 application source.
- Contains: `app/app.vue`, `app/pages/`, `app/layouts/`, `app/components/`, `app/composables/`, `app/utils/`, `app/plugins/`, `app/assets/` and `app/app.config.ts`.
- Add route files under `app/pages/`, reusable UI under the nearest component subdirectory, pure browser-safe projections under `app/utils/`, and shared content queries in `app/composables/content.ts`.

**`content/`:**
- Purpose: Filesystem content database consumed by Nuxt Content.
- Contains: `content/pages/`, `content/blog-articles/`, `content/blog-categories/`, `content/communities/`, and `content/people/`.
- Add frontmatter according to `content.config.ts`; use `YYYYMMDD.slug.md` for blog articles and preserve valid public route uniqueness.

**`server/`:**
- Purpose: Nitro server-only behavior.
- Contains: `server/api/events/index.get.ts`, `server/api/events/webhook.post.ts`, and `server/utils/portalEvents.ts`.
- Add external integrations behind a server utility and expose narrow API handlers; do not send raw upstream Portal records to the browser.

**`shared/`:**
- Purpose: Code consumed by more than one build/runtime boundary.
- Contains: `shared/data/contentRouteSources.ts`, `shared/data/partners.ts`, `shared/data/communityMapGeometry.json`, `shared/types/portalEvents.ts`, `shared/blogArticlesTransformer.ts`, and `shared/contentRedirectsModule.ts`.
- Put a type here only when both server and client production code consume it; keep one-consumer helpers local.

**`scripts/`:**
- Purpose: Node-only build validation.
- Key file: `scripts/validate-content-routes.ts`, which derives routes from content source files and rejects cross-collection collisions and root content under `/blog`.

**`tests/`:**
- Purpose: Node built-in test-runner coverage for pure projections, Portal behavior, webhook validation and route validation.
- Key files: `tests/calendarProjection.test.ts`, `tests/portalEvents.test.ts`, `tests/portalWebhook.test.ts`, and `tests/validateContentRoutes.test.ts`.

**`public/`:**
- Purpose: Files served without content collection processing.
- Contains: `public/app/`, `public/blog/`, `public/people/`, and `public/partners/` assets.
- Reference assets with root-relative URLs; keep content media naming aligned with `README.md`.

## Key File Locations

**Entry Points:**
- `app/app.vue`: Global Nuxt shell and head defaults.
- `app/pages/[...slug].vue`: Generic pages/communities route.
- `app/pages/blog/[[slug]].vue`: Blog index/category/article route.
- `app/pages/lide.vue`: People listing route.
- `server/api/events/index.get.ts`: Public calendar API.
- `server/api/events/webhook.post.ts`: Portal webhook endpoint.

**Configuration:**
- `nuxt.config.ts`: Modules, Nitro Cloudflare preset, D1/KV bindings, route rules, storage and sitemap settings.
- `content.config.ts`: Collection source directories, URL prefixes and schemas.
- `app/app.config.ts`: Nuxt UI colors and prose theme settings.
- `tsconfig.json`: References Nuxt-generated application, server, shared and node projects.

**Core Logic:**
- `server/utils/portalEvents.ts`: External event normalization and cache orchestration.
- `app/composables/content.ts`: Content query helpers and community projection.
- `app/utils/calendar.ts`: Calendar display and JSON-LD projection.
- `shared/data/contentRouteSources.ts`: Shared public route mapping.
- `shared/blogArticlesTransformer.ts`: Blog filename date extraction.

**Testing:**
- `tests/`: Focused Node tests.
- `scripts/validate-content-routes.ts`: Build-time route guard exercised by `tests/validateContentRoutes.test.ts`.

## Component Organization

**App/navigation:** `app/components/app/NavBar.vue`, `app/components/app/NavMenu.vue`, `app/components/app/SocialMenu.vue`, `app/components/app/Footer.vue`, and `app/components/app/Logo.vue`.

**Page renderers:** `app/components/page/BlogArticle.vue`, `app/components/page/BlogCategory.vue`, and `app/components/page/Community.vue`.

**Content/MDC components:** `app/components/HomepageHero.vue`, `app/components/content/Calendar.vue`, `app/components/PartnersList.vue`, and `app/components/DonateBlock.vue`.

**Reusable display components:** `app/components/AuthorBlock.vue`, `app/components/CategoriesBadges.vue`, `app/components/SocialLinks.vue`, and `app/components/CommunityMap.vue`.

## Content Organization

- `content/blog-articles/`: 26 Markdown articles at map time; filenames begin with `YYYYMMDD.` and route under `/blog`.
- `content/blog-categories/`: 12 category documents routed under `/blog`.
- `content/pages/`: 6 root page documents, including `content/pages/index.md` and `content/pages/kalendar.md`.
- `content/communities/`: 51 community documents routed at root paths.
- `content/people/`: 11 author/organizer records queried by `app/components/AuthorBlock.vue` and `app/pages/lide.vue` without a standalone people catch-all route.
- `content.config.ts`: Defines all five collections; only the four routed collections participate in `shared/data/contentRouteSources.ts` and route-collision validation.

## Naming Conventions

**Files:**
- Vue components use PascalCase, for example `app/components/CommunityMap.vue`.
- Composables use camelCase filenames and `use*` exports, for example `app/composables/content.ts`.
- Route files follow Nuxt conventions such as `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue`.
- Blog Markdown uses `YYYYMMDD.slug.md`; people, category, page and community Markdown uses lowercase slug names.

**Directories:**
- Group UI by responsibility: `app/components/app/`, `app/components/page/`, and `app/components/content/`.
- Keep shared generic display components directly under `app/components/`.
- Mirror Nuxt conventions for `app/pages/`, `app/layouts/`, `app/plugins/`, and `server/api/`.

## Where to Add New Code

**New feature:**
- Content-backed page: add Markdown under the relevant `content/` collection and render it through `app/pages/[...slug].vue`.
- Blog feature: use `content/blog-articles/` or `content/blog-categories/` and extend `app/pages/blog/[[slug]].vue` or `app/components/page/` only when routing/rendering needs it.
- External/server feature: add a narrow handler under `server/api/` and place normalization/cache logic in `server/utils/`.

**New component/module:**
- MDC component: `app/components/content/` when it is content-specific; `app/components/` for a reusable display component; `app/components/app/` for global navigation/frame UI.
- Pure transformation: `app/utils/` for client-safe logic, or `shared/` only when server and client both consume it.

**Utilities:**
- Content query and projection helpers: `app/composables/content.ts`.
- Calendar/map projections: `app/utils/calendar.ts` and `app/utils/communityMap.ts`.
- Shared data/constants: `shared/data/`.

## Special Directories

**`.planning/codebase/`:**
- Purpose: Committed GSD architecture, structure, quality, technology and concern maps.
- Generated: No; refresh intentionally from repository state.
- Committed: Yes.

**`.nuxt/`, `.output/`, `.data/`, `node_modules/`:**
- Purpose: Generated Nuxt output, deployment output, local storage and dependencies.
- Generated: Yes.
- Committed: No.

**`.devcontainer/`:**
- Purpose: Reproducible development environment and local agent data location.
- Generated: Definition committed; `.devcontainer/data/` is ignored local state.

**`public/`:**
- Purpose: Static runtime assets.
- Generated: No.
- Committed: Yes, except ignored paths governed by `.gitignore`.

---

*Structure analysis: 2026-09-01*
