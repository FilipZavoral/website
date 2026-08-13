---
last_mapped_commit: 61b3357818d020d1df7b707a487756d1a44a3608
---

# Concerns

## No automated test suite

- `package.json` has no `test` script, and no source `*.test.*` / `*.spec.*` files were found.
- Risk: route/content behavior can regress silently, especially because catch-all routes in `app/pages/[...slug].vue` and `app/pages/blog/[[slug]].vue` encode routing precedence.
- Practical mitigation: always run `npm run typecheck` and `npm run build`; add focused tests for `shared/blogArticlesTransformer.ts`, `shared/contentRedirectsModule.ts`, and route/content rendering when larger changes land.

## Navigation contains placeholders

TODO markers found in source:

- `app/components/app/NavMenu.vue` contains a child menu item labeled `TODO` under `Města`.
- `app/components/app/NavMenu.vue` contains `TODO loga s afil linky` under `Podpořit a partneři`.
- `content/pages/index.md` has `title: TODO` in frontmatter.

Risk: placeholder copy can leak to production navigation/metadata because these files are part of the live app/content surface.

## Content filename convention is load-bearing

- `shared/blogArticlesTransformer.ts` uses `idPattern = /^blogArticles\/blog\/(\d{4})(\d{2})(\d{2})\./` to extract publish dates.
- The README and project instructions require blog article filenames like `YYYYMMDD.slug.md` under `content/blog-articles/`.
- Risk: renaming a blog article without the prefix removes `published` derivation and may affect ordering, metadata, and templates.
- Mitigation: content authoring docs and reviews should enforce the prefix; a transformer unit test would catch accidental pattern breakage.

## Local module and transformer use `any`

- `shared/blogArticlesTransformer.ts` declares `transform(file: any)`.
- `shared/contentRedirectsModule.ts` reads Nuxt Content hook payloads via `(ctx: any)` and `ctx.content as any`.
- Risk: Nuxt Content API changes may break these extension points without TypeScript warning.
- Mitigation: narrow types if Nuxt exposes stable hook/transformer payload types, or add small build-time tests/mocks around these files.

## Content route precedence can create collisions

- `app/pages/[...slug].vue` checks `pages` before `communities` for the same `route.path`.
- `app/pages/blog/[[slug]].vue` checks `blogCategories` before `blogArticles` for the same `/blog/**` path.
- Risk: a page and community, or a blog category and article, can define the same path; the earlier query wins silently.
- Mitigation: add a content validation script that detects duplicate `path` values across route-sharing collections.

## Root-prefix collections share URL space

- `content.config.ts` gives both `communities` and `pages` a `/` prefix.
- This is intentional in current routing, but it makes content additions sensitive to path collisions and route ordering.
- Related files: `content.config.ts`, `app/pages/[...slug].vue`, `app/composables/content.ts`.

## Production target has Cloudflare-specific workarounds

- `nuxt.config.ts` uses Nitro `preset: 'cloudflare_module'` and aliases `sharp` to `unenv/mock/proxy-cjs` because `sharp` cannot run in Cloudflare Workers.
- Image provider behavior is conditional around preview deployments and Cloudflare constraints.
- Risk: changes to Nuxt Studio, Nuxt Image, or media handling could reintroduce unsupported Node/native dependencies.
- Mitigation: run `npm run build` after dependency/config changes and verify Cloudflare preview output where possible.

## Installed database packages are not clearly exercised by app code

- `@nuxthub/core`, `drizzle-orm`, `drizzle-kit`, `@libsql/client`, and `better-sqlite3` are installed/configured.
- No application-owned `server/api/`, schema, or DB access code was found in the source scan.
- Risk: future maintainers may assume a database-backed architecture exists when the current app is content-backed.
- Mitigation: document intended DB use before adding schema/routes, or remove unused packages if they remain unnecessary.

## Minimal observability

- There is no app-owned logging/error reporting layer in source.
- Client analytics exist via `app/plugins/counterscale.client.ts`, but analytics are not a substitute for operational error visibility.
- Risk: production rendering/content failures may require Cloudflare/Nuxt logs rather than first-class app diagnostics.

## Generated/log files in repository root

- `server.log`, `pages.log`, and `wrangler.log` exist at root.
- Generated directories such as `.nuxt/`, `.output/`, `.data/`, and `node_modules/` also exist in the working tree.
- Risk: agents or scripts may accidentally treat generated output/logs as source of truth.
- Mitigation: planning/execution should prefer source files (`app/`, `content/`, `shared/`, root configs) and inspect generated files only when debugging build output.
