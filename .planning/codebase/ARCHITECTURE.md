---
last_mapped_commit: 61b3357818d020d1df7b707a487756d1a44a3608
---

# Architecture

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
  - `app/components/AuthorBlock.vue`
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
