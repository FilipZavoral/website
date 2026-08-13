---
last_mapped_commit: 61b3357818d020d1df7b707a487756d1a44a3608
---

# Testing

## Current test framework status

No dedicated automated test framework is configured in source at map time.

Evidence:

- `package.json` contains scripts for `dev`, `build`, `typecheck`, and `prepare`, but no `test` script.
- No app source files matching `*.test.*`, `*.spec.*`, `tests/`, or `__tests__/` were found outside dependencies/generated directories.
- No `vitest.config.*`, `playwright.config.*`, Jest config, ESLint config, or Prettier config was found in source during the scan.

## Available verification commands

Use npm, not pnpm/yarn.

- Type checking: `npm run typecheck`
  - Runs `nuxt typecheck`.
  - This is the main lightweight correctness check expected by `AGENTS.md` after code changes.
- Production build: `npm run build`
  - Runs `NODE_OPTIONS=--max-old-space-size=4096 nuxt build`.
  - This exercises Nuxt Content generation, Nitro/Cloudflare output, sitemap setup, route rules, and component compilation.
- Local dev server: `npm run dev`
  - Runs `rm -rf .data/content && nuxt dev --port 2103`.
  - The cleanup step matters because Nuxt Content state under `.data/content` can become stale during content work.

## Manual/runtime verification surfaces

Because the site is content-driven, useful manual smoke checks after changes are:

- Home and generic pages resolved through `app/pages/[...slug].vue`, especially content under `content/pages/`.
- Blog index `/blog`, blog category pages from `content/blog-categories/`, and article pages from `content/blog-articles/`, all routed through `app/pages/blog/[[slug]].vue`.
- A known missing route, to confirm `app/error.vue` and `app/layouts/wallpaper.vue` still render the branded 404.
- Navigation menu category population from `app/components/app/NavMenu.vue` and `app/composables/content.ts`.
- Analytics proxy route `/cntrsclc` behavior only if testing production-like networking; avoid sending real analytics in normal local checks unless intended.

## Suggested future test structure

If tests are added later, align them with the architecture:

- Unit tests for pure-ish content helpers and extension logic:
  - `shared/blogArticlesTransformer.ts` filename/date extraction.
  - `shared/contentRedirectsModule.ts` redirect route rule behavior with mocked Nuxt hook context.
  - `app/composables/content.ts` category filtering in `useArticleCategories`.
- Component tests for rendering states in:
  - `app/components/page/BlogArticle.vue`
  - `app/components/page/BlogCategory.vue`
  - `app/components/page/Community.vue`
  - `app/components/app/NavMenu.vue`
- End-to-end/browser smoke tests for:
  - `/`
  - `/blog`
  - one blog category path
  - one blog article path
  - 404 route

## Coverage approach today

There is no coverage tooling or coverage threshold configured. Current confidence comes from type checking, Nuxt build success, content collection schema validation, and manual/browser verification.
