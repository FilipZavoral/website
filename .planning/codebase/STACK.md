---
last_mapped_commit: 406253b1b73b8ef1369805abfcfd98a6f3adb0d1
---
<!-- refreshed: 2026-09-01 -->
# Technology Stack

**Analysis Date:** 2026-09-01

## Languages

**Primary:**
- TypeScript 6 toolchain - application, server handlers, shared utilities, build scripts, and tests in `app/`, `server/`, `shared/`, `scripts/`, and `tests/`.
- Vue 3 single-file components - SSR-rendered UI in `app/**/*.vue`.

**Secondary:**
- Markdown/MDC - content collections in `content/` and Nuxt Content-rendered body content.
- CSS with Tailwind utility classes - global styling in `app/assets/css/main.css` and component templates.
- JSON, YAML, and shell-style workflow configuration - `package.json`, `nuxt.config.ts`, `.github/workflows/`, and `.devcontainer/devcontainer.json`.

## Runtime

**Environment:**
- Node.js 24 in CI (`.github/workflows/pr-preview.yml`) and the development container (`.devcontainer/devcontainer.json`).
- Nuxt SSR/Nitro on Cloudflare Workers for production; `nuxt.config.ts` uses the `cloudflare_module` preset and enables Node compatibility.

**Package Manager:**
- npm - scripts and dependency installation are defined in `package.json`.
- Lockfile: present, npm lockfile v3 in `package-lock.json`.

## Frameworks

**Core:**
- Nuxt `^4.3.0` - application framework, SSR, routing, auto-imports, and Nitro (`package.json`, `nuxt.config.ts`).
- Vue 3 - component model used by Nuxt pages and components in `app/`.
- Nuxt Content `^3.11.0` - typed Markdown collections, local SQLite content index, server queries, and content rendering (`content.config.ts`, `nuxt.config.ts`).
- Nuxt UI `^4.4.0` - accessible UI primitives and Czech locale setup (`app/app.vue`, `app/components/`).

**Testing:**
- Node built-in test runner - tests run with `node --experimental-strip-types --test tests/*.test.ts` via `package.json`.
- Nuxt typecheck / `vue-tsc` - generated Nuxt types and Vue TypeScript validation via `npm run typecheck`.

**Build/Dev:**
- Nitro - server API routes, storage adapters, prerendering, and Cloudflare deployment configuration in `nuxt.config.ts`.
- Vite - Nuxt-managed bundling and development server; `nuxt.config.ts` permits configured development hosts.
- Tailwind CSS `^4.1.18` - utility styling and Nuxt UI integration (`package.json`, `app/assets/css/main.css`).
- Wrangler `^4.102.0` - Cloudflare Workers deployment, including temporary PR previews (`package.json`, `.github/workflows/pr-preview.yml`).

## Key Dependencies

**Critical:**
- `@nuxthub/core` `^0.10.7` - SQLite-compatible NuxtHub database configuration and Cloudflare D1 production binding (`nuxt.config.ts`).
- `@nuxt/image` `^2.0.0` - image handling with environment-sensitive `ipx`, Cloudflare, or no-op provider selection (`nuxt.config.ts`).
- `@nuxtjs/sitemap` `^8.2.1` - sitemap generation and collection schema integration (`content.config.ts`, `nuxt.config.ts`).
- `nuxt-studio` `^1.5.1` - GitHub-backed content editing configuration (`nuxt.config.ts`).
- `drizzle-orm` `^0.45.1` and `drizzle-kit` `^0.31.9` - database tooling available through NuxtHub; no application-owned schema files are present.
- `@counterscale/tracker` `^3.4.1` - browser analytics initialized in `app/plugins/counterscale.client.ts`.
- `qrcode` `^1.5.4` - client/server-safe QR generation for Lightning donation addresses (`app/components/DonateBlock.vue`, `app/components/PersonBlock.vue`).

**Infrastructure:**
- `@vueuse/nuxt` / `@vueuse/core` `^14.2.1` - Nuxt-integrated Vue composables.
- `@iconify-json/lucide`, `@iconify-json/simple-icons`, and `@iconify-json/streamline` - Nuxt UI and social/icon assets (`package.json`, `app/components/`).
- `@libsql/client` `^0.17.0`, `better-sqlite3` `^12.11.1` - SQLite/libSQL runtime and development support available to the content/Hub stack.
- `typescript`, `vue-tsc`, `@vue/language-core`, and `@types/*` - static typing and generated Vue/Nuxt type support (`package.json`).

## Configuration

**Environment:**
- `nuxt.config.ts` reads `NUXT_BUILD_DIR`, `PREVIEW_DEPLOY`, `NUXT_IMAGE_PROVIDER`, `NODE_ENV`, `STUDIO_BRANCH_NAME`, and `NUXT_PORTAL_WEBHOOK_SECRET`.
- `NUXT_PORTAL_WEBHOOK_SECRET` is exposed only through private runtime config for the Portal webhook (`nuxt.config.ts`, `server/api/events/webhook.post.ts`).
- `.env` is present for local configuration; its contents are intentionally not inspected. `.env.example` documents the optional `PPQ_API_KEY` used by the development tooling rather than application runtime.

**Build:**
- `nuxt.config.ts` defines modules, content SQLite location, content transformers, sitemap exclusions, image providers, Nitro storage, Cloudflare bindings, route rules, and prerendering.
- `content.config.ts` defines typed collections and shared sitemap/navigation metadata.
- `shared/blogArticlesTransformer.ts` derives publication dates from date-prefixed article IDs.
- `scripts/validate-content-routes.ts` runs before `nuxt build` to reject public content-route collisions.
- `tsconfig.json` references Nuxt-generated app, server, shared, and node projects rather than declaring standalone source roots.

## Platform Requirements

**Development:**
- Node.js/npm and a Nuxt-compatible environment; the repository supplies a preconfigured image via `.devcontainer/devcontainer.json`.
- Local Nuxt Content SQLite cache at `/tmp/jednadvacet-content.sqlite` and local Portal event filesystem storage at `/tmp/jednadvacet-portal-events` (`nuxt.config.ts`).

**Production:**
- Cloudflare Workers with a D1 database binding named `DB` and a KV namespace binding named `PORTAL_EVENT_SNAPSHOTS` (`nuxt.config.ts`).
- Cloudflare image handling is selected for production unless overridden by `NUXT_IMAGE_PROVIDER`; preview deployments use the `none` provider.
- GitHub Actions deploys isolated PR previews with `wrangler deploy --temporary` (`.github/workflows/pr-preview.yml`).

---

*Stack analysis: 2026-09-01*
