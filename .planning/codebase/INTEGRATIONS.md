---
last_mapped_commit: 61b3357818d020d1df7b707a487756d1a44a3608
---

# Integrations

## Cloudflare Workers and NuxtHub

- Production is documented as Cloudflare Workers in `README.md` and configured in `nuxt.config.ts` through Nitro `preset: 'cloudflare_module'`.
- `@nuxthub/core` is registered in `nuxt.config.ts` and `hub: { db: 'sqlite' }` is enabled. No application-owned database schema or server routes were found in this scan; the installed Drizzle/libSQL packages appear available for future Hub DB work.
- `nuxt.config.ts` aliases `sharp` to `unenv/mock/proxy-cjs` under `nitro.alias` because `sharp` cannot run on Cloudflare Workers and is pulled transitively by Nuxt Studio media tooling.
- `nuxt.config.ts` also allows Vite dev server hosts with `vite.server.allowedHosts: true`, useful in container/preview environments.

## Analytics: Counterscale

- Client analytics are initialized in `app/plugins/counterscale.client.ts` using `@counterscale/tracker`.
- The plugin calls `Counterscale.init({ siteId: window.location.hostname, reporterUrl: '/cntrsclc' })`.
- `nuxt.config.ts` defines `routeRules['/cntrsclc']` as a proxy to `https://analytics.jednadvacet.org/collect`, masking the tracker collect URL to reduce ad-blocker interference.
- Because the plugin is named `counterscale.client.ts`, it only runs in the browser and safely accesses `window.location.hostname`.

## Nuxt Studio and GitHub-backed editing

- `nuxt-studio` is registered in `nuxt.config.ts`.
- The `studio` block in `nuxt.config.ts` enables local Studio dev mode and points at GitHub repository `Jednadvacetorg/web`, branch `process.env.STUDIO_BRANCH_NAME || 'master'`, `private: false`.
- `.github/CODEOWNERS` assigns all files to `@iBobik` and `/content/` to `@Long-BTC-81`, which matters for content-edit review flows.

## Sitemap and SEO integrations

- `@nuxtjs/sitemap` is registered in `nuxt.config.ts`.
- `site.url` is `https://jednadvacet.org` and `site.name` is `Jednadvacet` in `nuxt.config.ts`.
- Sitemap excludes `/_studio/**`, `/debug/**`, and `/cntrsclc` in `nuxt.config.ts`.
- `content.config.ts` imports `defineSitemapSchema` and each content collection schema includes `sitemap: defineSitemapSchema()`.
- `app/app.vue` sets global Czech language, title template `%s | Jednadvacet`, and a canonical link derived from the current route path.

## Image infrastructure

- `@nuxt/image` is registered in `nuxt.config.ts`.
- `nuxt.config.ts` configures `image.provider` conditionally for Cloudflare preview deployment contexts, with a Cloudflare base URL of `/`.
- Static images are organized primarily under `public/app/`, `public/avatars/`, and `public/blog/`.
- Components such as `app/components/page/BlogArticle.vue`, `app/components/page/Community.vue`, and `app/components/AuthorBlock.vue` use Nuxt image/UI image-capable surfaces for thumbnails and avatars.

## Content as an internal integration surface

- The application integrates heavily with local Markdown content through `@nuxt/content`.
- Runtime routes resolve content via `queryCollection`:
  - `app/pages/[...slug].vue` queries `pages` first and then `communities` for non-blog paths.
  - `app/pages/blog/[[slug]].vue` handles the blog index, then queries `blogCategories`, then `blogArticles`.
  - `app/composables/content.ts` centralizes reusable category/community queries.
- `shared/contentRedirectsModule.ts` listens to `content:file:afterParse` and converts frontmatter `redirect_from` arrays into Nuxt route rules with 301 redirects.

## Development container and agent tooling

- `.devcontainer/Dockerfile`, `.devcontainer/docker-compose.yml`, and `.devcontainer/devcontainer.json` define a containerized development environment.
- The devcontainer installs `agent-browser`, `skills`, `tmux`, and related agent tooling. This is development infrastructure, not runtime application code.

## External services not currently implemented in source

- Auth providers: no user auth implementation or OAuth callback surface was found in app/server source. Nuxt Studio may involve its own auth externally, but app code only contains repository configuration in `nuxt.config.ts`.
- Email/SMS/comms services: none found.
- Custom public API routes: no `server/api/` or `server/routes/` source files were found in the whole-repo scan.
