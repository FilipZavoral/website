---
last_mapped_commit: 61b3357818d020d1df7b707a487756d1a44a3608
---

# Conventions

## Language and component style

- Vue single-file components use `<script setup lang="ts">`, as seen in `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue`, `app/error.vue`, and navigation/content components.
- Type-only imports are used for Nuxt Content and Nuxt UI generated types, for example `import type { BlogArticlesCollectionItem } from '@nuxt/content'` in `app/pages/blog/[[slug]].vue` and `import type { NavigationMenuItem } from '@nuxt/ui'` in `app/components/app/NavMenu.vue`.
- Nuxt auto-imported composables are used directly (`useRoute`, `useHead`, `useAsyncData`, `queryCollection`, `createError`, `computed`) rather than manually importing them from Nuxt.

## UI conventions

- Prefer Nuxt UI components instead of custom controls. The project instruction in `AGENTS.md` explicitly requires this, and source examples include:
  - `app/app.vue` uses `<UApp :locale="cs">`.
  - `app/components/app/NavMenu.vue` uses Nuxt UI navigation menu item types and menu structures.
  - Shared components use Nuxt UI link/icon/badge/avatar style primitives.
- Styling is primarily Tailwind utility classes in templates plus theme tokens in `app/assets/css/main.css` and `app/app.config.ts`.
- Global brand color is orange. `app/app.config.ts` sets Nuxt UI `primary: 'orange'`, and `app/assets/css/main.css` defines orange shades from `--color-orange-50` through `--color-orange-950`.
- App locale is Czech through `import { cs } from '@nuxt/ui/locale'` and `<UApp :locale="cs">` in `app/app.vue`.

## Content naming and routing conventions

- Blog articles live in `content/blog-articles/` and should be named `YYYYMMDD.slug.md`. `shared/blogArticlesTransformer.ts` derives the article `published` date from this filename pattern.
- Blog article ordering should use `id` because the filename/date prefix is embedded there. This is also called out in `AGENTS.md`.
- Blog categories live in `content/blog-categories/` and are routed under `/blog` through `content.config.ts`.
- Generic pages live in `content/pages/` and are routed at `/` through the catch-all `app/pages/[...slug].vue`.
- Communities live in `content/communities/` and are also routed at `/`, after pages are checked.
- People metadata lives in `content/people/`, but people have no standalone routes according to the sitemap comment in `nuxt.config.ts`.

## Data fetching conventions

- Route-level content fetching uses `await useAsyncData(...)` in `<script setup>`, returning explicit union result shapes. Examples:
  - `app/pages/blog/[[slug]].vue` returns `{ type: 'index' }`, `{ type: 'category'; category: ... }`, or `{ type: 'article'; article: ... }`.
  - `app/pages/[...slug].vue` returns `{ type: 'page'; page: ... }` or `{ type: 'community'; community: ... }`.
- Reusable collection queries belong in composables. `app/composables/content.ts` exposes `useDataBlogCategories`, `useArticleCategories`, and `useDataCommunities`.
- Query projections should select only needed fields for list/navigation data. `app/composables/content.ts` uses `.select('path', 'title')` for category and community lists.

## Error handling conventions

- Missing route content throws fatal Nuxt errors with `createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })` from `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue`.
- Global rendering of errors is centralized in `app/error.vue`; 404 gets special Czech copy and other errors fall back to a general message.
- No custom exception hierarchy or structured server-side error logger was found.

## SEO conventions

- Global defaults are set in `app/app.vue`: `htmlAttrs.lang = 'cs'`, title template `%s | Jednadvacet`, and canonical link based on the route path.
- Site-level metadata lives in `nuxt.config.ts` under `site`.
- Content collection schemas include hidden SEO/navigation fields in `content.config.ts`, allowing content frontmatter to drive metadata while keeping some fields hidden in Studio.
- Sitemap schema support is included per collection with `defineSitemapSchema()` in `content.config.ts`.

## Redirect conventions

- Content frontmatter can include `redirect_from` arrays.
- `shared/contentRedirectsModule.ts` converts each redirect source into a Nuxt route rule redirecting with HTTP 301 to the parsed content `path`.
- Because redirects are generated at content parse time, content path/frontmatter changes can affect route rules.

## Logging and observability conventions

- There is no app-owned logging framework in source.
- Client analytics are handled by `app/plugins/counterscale.client.ts` and proxied through `/cntrsclc` route rules.
- Root log files (`server.log`, `pages.log`, `wrangler.log`) exist but are not part of a structured application logging subsystem.

## TypeScript strictness and escape hatches

- The project uses Nuxt-generated TypeScript config via `tsconfig.json` extending `.nuxt/tsconfig.json`.
- Two extension points currently use `any` because of Nuxt Content hook/transformer payloads:
  - `shared/blogArticlesTransformer.ts` has `transform(file: any)`.
  - `shared/contentRedirectsModule.ts` casts `ctx.content as any`.
- Avoid expanding `any` usage in normal app code; prefer generated content item types from `@nuxt/content`.

## Content authoring conventions from README

- Blog articles are Markdown files under `content/blog-articles/`.
- Blog images go under `public/blog/`.
- The README is written for Czech content editors and should be kept aligned with `content.config.ts` if collection schemas or paths change.
