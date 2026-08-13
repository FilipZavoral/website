---
last_mapped_commit: 61b3357818d020d1df7b707a487756d1a44a3608
---

# Structure

## Top-level layout

- `app/` — Nuxt 4 application source: app shell, pages, layouts, components, composables, plugins, and CSS.
- `content/` — Nuxt Content Markdown source. Drives public pages, blog articles/categories, communities, and people metadata.
- `public/` — static assets served from the site root. Important subdirectories include `public/app/`, `public/avatars/`, and `public/blog/`.
- `shared/` — project-local Nuxt/Content extensions shared with the Nuxt runtime/build, currently `shared/blogArticlesTransformer.ts` and `shared/contentRedirectsModule.ts`.
- `.devcontainer/` — container development environment files.
- `.github/` — repository metadata, currently `CODEOWNERS`.
- `.agents/` — project-local agent skills/instructions, not application runtime code.
- `.gsd/` — GSD workflow state and generated reference docs. This map is written under `.gsd/codebase/`.
- `old.jednadvacet.org/` — legacy site/archive directory present in the repo. It is separate from the Nuxt 4 app surface.
- Generated/ephemeral directories seen during mapping: `node_modules/`, `.nuxt/`, `.output/`, `.data/`; do not treat these as source of truth for planning unless debugging generated output.

## Root entry/config files

- `package.json` — npm scripts and dependency declarations.
- `package-lock.json` — npm lockfile, lockfile version 3.
- `nuxt.config.ts` — Nuxt modules, Content transformer registration, Cloudflare/Nitro configuration, sitemap/site metadata, route proxy for analytics, Nuxt Studio config, and Vite dev server settings.
- `content.config.ts` — typed Nuxt Content collections and schemas.
- `tsconfig.json` — TypeScript config extending Nuxt-generated `.nuxt/tsconfig.json`.
- `README.md` — Czech project documentation covering stack and content authoring conventions.
- `AGENTS.md` — developer instructions for AI agents working in this repo.

## `app/` directory

- `app/app.vue` — global app shell. Wraps pages in `UApp`, `NuxtLayout`, `NuxtRouteAnnouncer`, and `NuxtPage`; sets Czech `lang`, title template, and canonical link.
- `app/error.vue` — global Nuxt error page, rendered with the `wallpaper` layout.
- `app/app.config.ts` — Nuxt UI theme settings (`primary: orange`, `gray: cool`, prose image classes).
- `app/assets/css/main.css` — Tailwind/Nuxt UI imports and custom orange color palette.
- `app/layouts/default.vue` — normal site frame, with navigation, slot, and footer.
- `app/layouts/wallpaper.vue` — visual layout for pages/errors with a background image.
- `app/pages/blog/[[slug]].vue` — optional catch-all route for `/blog` index, categories, and articles.
- `app/pages/[...slug].vue` — catch-all route for content pages and communities.
- `app/composables/content.ts` — reusable `queryCollection` helpers for blog categories and communities.
- `app/plugins/counterscale.client.ts` — browser-only analytics initialization.

## Components

### App/navigation components

- `app/components/app/NavBar.vue` — top navigation wrapper.
- `app/components/app/NavMenu.vue` — primary navigation menu. Uses `NavigationMenuItem` from `@nuxt/ui` and merges static menu items with dynamic blog categories from `useDataBlogCategories()`.
- `app/components/app/SocialMenu.vue` — social link menu wrapper.
- `app/components/app/Footer.vue` — footer content and site/social links.
- `app/components/app/Logo.vue` — logo rendering.

### Content/page components

- `app/components/page/BlogArticle.vue` — renders an individual blog article page and article metadata.
- `app/components/page/BlogCategory.vue` — renders a blog category page and associated articles.
- `app/components/page/Community.vue` — renders community content.

### Shared display components

- `app/components/AuthorBlock.vue` — author/person display, including avatar-style UI.
- `app/components/CategoriesBadges.vue` — blog category badge display.
- `app/components/SocialLinks.vue` — social link rendering with icons/links.

## `content/` directory

- `content/blog-articles/` — blog article Markdown files. Naming convention is `YYYYMMDD.slug.md`, and `shared/blogArticlesTransformer.ts` derives publish dates from the date prefix.
- `content/blog-categories/` — blog category Markdown routed under `/blog`.
- `content/pages/` — generic site pages routed at root prefix `/`.
- `content/communities/` — community pages routed at root prefix `/`.
- `content/people/` — people/author metadata Markdown used by content components. `content.config.ts` does not currently define a public page collection for standalone people routes; `nuxt.config.ts` sitemap comments state people have no standalone routes.

Content counts at map time:

- `content/blog-articles/`: 26 Markdown files.
- `content/blog-categories/`: 12 Markdown files.
- `content/pages/`: 7 Markdown files.
- `content/communities/`: 1 Markdown file.
- `content/people/`: 8 Markdown files.

## Static assets

- `public/app/` — application-level images such as wallpaper/not-found assets.
- `public/avatars/` — person/author avatar images.
- `public/blog/` — images referenced by blog article Markdown.

The README documents the intended blog image naming convention under `public/blog/`.

## Tests

- No dedicated `tests/`, `__tests__/`, `*.test.*`, or `*.spec.*` source test files were found in the app source scan.
- Verification currently relies on `npm run typecheck` and build/runtime checks.

## Generated files and logs

- `.nuxt/`, `.output/`, `.data/`, and `node_modules/` are generated/dependency directories.
- `server.log`, `pages.log`, and `wrangler.log` exist at the repo root; treat them as logs rather than app source.
