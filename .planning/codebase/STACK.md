---
last_mapped_commit: 61b3357818d020d1df7b707a487756d1a44a3608
---

# Stack

## Runtime and language

- TypeScript / Vue single-file components. The package is ESM via `"type": "module"` in `package.json`.
- Nuxt 4 application. `package.json` pins `nuxt` at `^4.3.0`, and the source follows the Nuxt 4 `app/` directory layout (`app/app.vue`, `app/pages/`, `app/components/`, `app/layouts/`).
- Vue 3 Composition API through Nuxt auto-imports. Representative files use `<script setup lang="ts">`, `useRoute`, `useAsyncData`, `computed`, and `queryCollection`, for example `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue`, and `app/composables/content.ts`.
- No Node engine is declared in `package.json` or the root package entry in `package-lock.json`; dependency versions imply a modern Node compatible with Nuxt 4.

## Package manager and lockfile

- npm is the package manager. Evidence: `package-lock.json` exists, lockfile version is 3, and project instructions explicitly say dependencies are managed by npm.
- Main scripts in `package.json`:
  - `npm run dev` -> `rm -rf .data/content && nuxt dev --port 2103`
  - `npm run build` -> `NODE_OPTIONS=--max-old-space-size=4096 nuxt build`
  - `npm run typecheck` -> `nuxt typecheck`
  - `npm run prepare` -> `npx skills experimental_install -y`

## Nuxt modules and framework libraries

Configured in `nuxt.config.ts`:

- `@nuxt/content` (`^3.11.0`) for typed Markdown content collections from `content/`.
- `@nuxt/ui` (`^4.4.0`) for UI components. `app/app.vue` wraps the app in `<UApp :locale="cs">`, and components use Nuxt UI primitives like `UNavigationMenu`, `ULink`, `UAvatar`, `UBadge`, and `UIcon`.
- `@nuxt/image` (`^2.0.0`) for optimized images. `nuxt.config.ts` switches provider behavior for Cloudflare preview deployments.
- `@nuxthub/core` (`^0.10.7`) with `hub: { db: 'sqlite' }` in `nuxt.config.ts`.
- `@nuxtjs/sitemap` (`^8.2.1`) with `site` metadata and collection-level sitemap schemas in `content.config.ts`.
- `@vueuse/nuxt` is registered in `nuxt.config.ts`; direct usage is not prominent in representative app files.
- `nuxt-studio` (`^1.5.1`) for editing content through GitHub-backed Studio configuration.
- Project-local Nuxt module `shared/contentRedirectsModule.ts` for content-authored redirects.

## Styling and UI system

- Tailwind CSS v4 (`tailwindcss` `^4.1.18`) plus Nuxt UI CSS are imported in `app/assets/css/main.css`:
  - `@import "tailwindcss";`
  - `@import "@nuxt/ui";`
- Brand colors are defined with Tailwind v4 `@theme static` custom orange tokens in `app/assets/css/main.css`.
- Nuxt UI theme configuration lives in `app/app.config.ts`, setting `primary: 'orange'`, `gray: 'cool'`, and prose image classes.

## Content stack

- `@nuxt/content` collections are defined in `content.config.ts`:
  - `blogArticles` from `content/blog-articles/**` with `/blog` prefix.
  - `blogCategories` from `content/blog-categories/**` with `/blog` prefix.
  - `communities` from `content/communities/**` with `/` prefix.
  - `pages` from `content/pages/**` with `/` prefix.
- Blog publish dates are derived from filenames by `shared/blogArticlesTransformer.ts`, which extracts `YYYY-MM-DD` from IDs like `blogArticles/blog/20230816...` and writes `file.published`.
- Content volume at map time: 26 blog articles, 12 blog categories, 1 community collection index file, 7 pages, and 8 people files under `content/`.

## Build and deploy target

- Nuxt/Nitro target is Cloudflare Workers module mode via `preset: 'cloudflare_module'` in `nuxt.config.ts`.
- `nuxt.config.ts` contains a Nitro alias for `sharp` to `unenv/mock/proxy-cjs` because `sharp` cannot run in Cloudflare Workers and is pulled transitively by Nuxt Studio IPX media handling.
- Generated `.output/server/wrangler.json` exists, but no source `wrangler.toml` was found at the repo root during mapping.

## Other notable dependencies

- `@counterscale/tracker` for client analytics, initialized in `app/plugins/counterscale.client.ts`.
- `qrcode` plus `@types/qrcode`; direct source usage was not observed in the representative scan.
- `drizzle-orm`, `drizzle-kit`, `@libsql/client`, and `better-sqlite3` are installed, but no app schema/server database usage was found outside NuxtHub/content-generated artifacts.
- Icon packages include `@iconify-json/simple-icons`, `@iconify-json/streamline`, and dev dependency `@iconify-json/lucide` for Nuxt UI icon names used by `UIcon` and component props.
