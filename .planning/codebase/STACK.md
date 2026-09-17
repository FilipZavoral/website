---
last_mapped_commit: 599ee9aa4c15c119dae17486c0f6ea5999b32b9e
last_mapped_at: 2026-09-15
---
# Technology Stack

**Analysis Date:** 2026-09-15

## Languages

**Primary:**

- TypeScript 6.0 toolchain - application, Nitro server handlers, background tasks, shared types, scripts, and tests in `app/`, `server/`, `shared/`, `scripts/`, and `tests/`.
- Vue 3 single-file components - SSR UI and client interaction in `app/**/*.vue`.
- Markdown/MDC - typed site content and embedded Nuxt UI components in `content/`.

**Secondary:**

- CSS with Tailwind CSS v4 directives and theme tokens - `app/assets/css/main.css`.
- JSON, YAML, and shell - static data/configuration in `shared/data/`, `content/`, `.github/workflows/`, and `nuxt.config.ts`-generated deployment settings.

## Runtime

**Environment:**

- Node.js 24 in CI (`.github/workflows/pr-preview.yml`); local development runs in the `opencode-gsd-devcontainer` image configured by `.devcontainer/devcontainer.json`.
- Cloudflare Workers with Nitro's `cloudflare_module` preset in production (`nuxt.config.ts`). The configuration enables `nodeCompat: true` but must remain Web API and Worker compatible.

**Package Manager:**

- npm - scripts and dependency installation are defined in `package.json`.
- Lockfile: present (`package-lock.json`, lockfile version 3).

## Frameworks

**Core:**

- Nuxt 4.3.x - SSR application framework, file routing, auto-imports, Nitro server, tasks, and build pipeline (`package.json`, `nuxt.config.ts`).
- Vue 3 - component and reactivity runtime used throughout `app/`.
- Nitro/H3 - server routes, middleware, storage, scheduled tasks, and request handling under `server/`.
- `@nuxt/content` 3.11.x - typed Markdown collections, SQLite-backed content database, MDC rendering, and generated collection types (`content.config.ts`).
- `@nuxt/ui` 4.4.x with Tailwind CSS 4.1.x - accessible UI primitives and styling (`app/app.vue`, `app/app.config.ts`, `app/assets/css/main.css`).

**Testing:**

- Node built-in test runner - behavior tests in `tests/*.test.ts`, invoked by `npm test`.
- TypeScript, `vue-tsc`, and Nuxt generated types - static verification invoked by `npm run typecheck`.
- No separate test framework or browser-test runner is configured in `package.json`.

**Build/Dev:**

- Vite through Nuxt - development server and bundling (`package.json`, `nuxt.config.ts`).
- Wrangler 4.102.x - Cloudflare Worker deployment and temporary PR previews (`package.json`, `.github/workflows/pr-preview.yml`).
- NuxtHub Core 0.10.x - database/blob integration and `hub:blob` server bindings (`nuxt.config.ts`, `server/plugins/communityMapsQueue.ts`).
- `nuxt-studio` 1.5.x - repository-backed content editing at `/_studio` (`nuxt.config.ts`).
- `@vueuse/nuxt` 14.2.x - VueUse auto-import integration (`nuxt.config.ts`).

## Key Dependencies

**Critical:**

- `@nuxt/content` - content collections and generated typed records consumed by `app/pages/`, `app/composables/`, and server tasks.
- `@nuxt/ui` - application shell and component library, wrapped by `UApp` in `app/app.vue`.
- `@nuxthub/core` - local filesystem/blob and production Cloudflare D1/R2 integration configured in `nuxt.config.ts`.
- `@nuxt/image` 2.x - `NuxtImg` image rendering in `app/components/`; provider selection is environment-specific in `nuxt.config.ts`.
- `@nuxtjs/sitemap` 8.2.x - sitemap generation and collection schema support in `content.config.ts` and `nuxt.config.ts`.
- `nuxt-studio` - content editor and GitHub repository integration.

**Infrastructure:**

- `drizzle-orm` and `drizzle-kit` - installed database ORM/schema tooling for the NuxtHub/SQLite stack; no direct application imports are detected outside generated/framework integration.
- `@libsql/client` and `better-sqlite3` - installed SQLite/LibSQL drivers used for local or framework tooling compatibility; application persistence is configured through Nuxt Content/NuxtHub rather than hand-written client calls.
- `@counterscale/tracker` - client analytics in `app/plugins/counterscale.client.ts`.
- `ical.js` - iCalendar serialization in `server/routes/ical/[slug].get.ts`.
- `qrcode` - lazy client-side Lightning URI QR generation in `app/components/LightningQrCode.vue`.
- `@vueuse/core` and `@vueuse/nuxt` - client utility/composable support.
- `@iconify-json/bitcoin-icons`, `lucide`, `pinhead`, `simple-icons`, and `streamline` - bundled icon collections restricted by `nuxt.config.ts`.

## Configuration

**Environment:**

- Runtime secrets and private integration values are exposed through Nuxt `runtimeConfig` in `nuxt.config.ts`; production values are expected as Cloudflare Worker secrets and local names are documented without values in `.env.example`.
- Required integration variables include `NUXT_PORTAL_WEBHOOK_SECRET`, `NUXT_GOOGLE_OAUTH_CLIENT_ID`, `NUXT_GOOGLE_OAUTH_SECRET`, `NUXT_GOOGLE_OAUTH_REFRESH_TOKEN`, `NUXT_GOOGLE_LEGACY_CALENDAR_ID`, `NUXT_EVENTS_ADMIN_TOKEN`, and `NUXT_MAPBOX_ACCESS_TOKEN` (`.env.example`, `nuxt.config.ts`).
- Build/environment switches include `PREVIEW_DEPLOY`, `NUXT_BUILD_DIR`, `NUXT_IMAGE_PROVIDER`, `STUDIO_BRANCH_NAME`, and `NODE_ENV` (`nuxt.config.ts`).
- `.env` exists locally but is ignored; do not read or commit its contents. `.env.example` is the safe source of variable names.

**Build:**

- `nuxt.config.ts` defines modules, content's local SQLite path, renderer aliases, runtime config, image providers, NuxtHub storage, Nitro tasks, Cloudflare bindings, queues, cron schedules, route rules, sitemap exclusions, and Studio.
- `content.config.ts` defines typed collections, Zod schemas, route prefixes, indexes, and sitemap filtering.
- `tsconfig.json` references Nuxt-generated app, server, shared, and node configs rather than maintaining an independent compiler configuration.
- `app/assets/css/main.css` imports Tailwind and Nuxt UI and defines the project orange palette.
- `package.json` defines `build`, `build:cloudflare`, `test`, `typecheck`, `dev`, and tunnel scripts. `npm run build` first runs `scripts/validate-content-routes.ts`.

## Platform Requirements

**Development:**

- npm and Node.js compatible with the Nuxt 4/TypeScript toolchain; the repository's devcontainer supplies the recommended environment (`.devcontainer/devcontainer.json`).
- Writable local `.data/` storage for NuxtHub blob data and generated framework state; Nuxt Content uses `/tmp/jednadvacet-content.sqlite` because the devcontainer workspace mount has unreliable SQLite writes (`nuxt.config.ts`).
- Optional local credentials from `.env.example` for Portal refresh, Google synchronization, Mapbox generation, and admin endpoints.

**Production:**

- Cloudflare Workers project named `jednadvacetorg-web`, deployed with Wrangler/Nitro's `cloudflare_module` preset (`nuxt.config.ts`).
- Cloudflare D1 binding `DB`, KV namespace binding `PORTAL_EVENT_SNAPSHOTS`, R2 binding `BLOB`, and queues `community-maps` and `portal-events` are generated/configured by `nuxt.config.ts`.
- Cloudflare cron triggers run map and Portal refresh tasks daily; production observability logs/traces are emitted through the generated Wrangler configuration.

---

*Stack analysis: 2026-09-15*
