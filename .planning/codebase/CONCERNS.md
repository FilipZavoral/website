---
last_mapped_commit: 406253b1b73b8ef1369805abfcfd98a6f3adb0d1
---
<!-- refreshed: 2026-09-01 -->
# Codebase Concerns

**Analysis Date:** 2026-09-01

## Tech Debt

**Incomplete navigation and calendar copy:**
- Issue: Production-facing navigation contains literal `TODO` items, and the calendar subscription section has a TODO description.
- Files: `app/components/app/NavMenu.vue`, `content/pages/kalendar.md`
- Impact: Users see unfinished navigation entries and an incomplete content section.
- Fix approach: Replace each placeholder with the intended route/content or remove the item; treat each product decision as a separate content task.

**Overly permissive content schemas:**
- Issue: Shared SEO/navigation metadata uses `z.any()`, and blog articles use `.passthrough()`.
- Files: `content.config.ts`
- Impact: Unexpected frontmatter and upstream fields can enter generated content types and rendering paths without schema validation.
- Fix approach: Define narrow schemas for supported metadata and explicitly select fields needed by rendering components.

**Untyped build extension boundaries:**
- Issue: Nuxt Content transformer and hook payloads use `any`.
- Files: `shared/blogArticlesTransformer.ts`, `shared/contentRedirectsModule.ts`
- Impact: Framework payload changes can fail at build time or silently stop date/redirect processing without TypeScript diagnostics.
- Fix approach: Use stable Nuxt Content hook/transformer types when available and add boundary fixtures for malformed payloads.

**Database and integration dependency surface exceeds application use:**
- Issue: Drizzle, LibSQL, Better SQLite, and NuxtHub database packages/configuration are present, while current domain storage is content plus Portal event cache.
- Files: `package.json`, `nuxt.config.ts`, `server/utils/portalEvents.ts`
- Impact: Larger installs and more upgrade/security surface obscure the actual architecture and can pull incompatible Node-oriented code into the Worker build.
- Fix approach: Document the intended database boundary or remove packages/configuration that have no production consumer after confirming deployment requirements.

## Known Bugs

**Calendar weekday assertion is failing:**
- Symptoms: The test expects `PO`, but the runtime formatter returns lowercase `po`.
- Files: `tests/calendarProjection.test.ts`, `app/utils/calendar.ts`
- Trigger: Run `npm test` on the current commit.
- Workaround: None; the test suite currently exits non-zero.

**Typecheck fails because app entry files differ only by case:**
- Symptoms: `nuxt typecheck` reports TS1149 for `app/App.vue` and `app/app.vue`.
- Files: `app/App.vue`, `app/app.vue`
- Trigger: Run `npm run typecheck` on a case-sensitive filesystem.
- Workaround: None; remove or rename the duplicate entry while preserving the intended Nuxt entry convention.

**Community detail exposes map implementation/debug data:**
- Symptoms: Community pages display latitude, longitude, and zoom values in a bordered block rather than only rendering the map/navigation experience.
- Files: `app/components/page/Community.vue`
- Trigger: Open any community content page with a `map` frontmatter object.
- Workaround: None; this is visible to every visitor of an affected page.

**Canonical URL expression does not provide the intended fallback:**
- Symptoms: The concatenation is evaluated before `|| '/'`, so the fallback is ineffective; the root canonical URL also omits its trailing slash.
- Files: `app/app.vue`, `app/App.vue`
- Trigger: Render the root page or inspect canonical links on routes with an empty/normalized path.
- Workaround: None; normalize the complete URL before applying a fallback.

## Security Considerations

**Untrusted Portal fields are retained and sent to browsers:**
- Risk: `parseEvent` spreads nearly all upstream fields into the shared event object, including fields such as creator metadata and unsafe raw links.
- Files: `server/utils/portalEvents.ts`, `shared/types/portalEvents.ts`, `tests/portalEvents.test.ts`
- Current mitigation: Meetup-identifying fields are removed, navigation uses only `safeLink`, and link protocols are restricted to HTTP(S), mailto, and tel.
- Recommendations: Allowlist fields at the server boundary, avoid exposing private upstream metadata, and keep raw diagnostic fields out of the cache/API response.

**Remote event descriptions are passed to MDC:**
- Risk: Portal-controlled description text is rendered as Markdown/MDC, creating a framework/component parsing boundary if upstream data is compromised or abused.
- Files: `app/components/content/Calendar.vue`, `server/utils/portalEvents.ts`
- Current mitigation: The server validates the event envelope and JSON-LD escapes `<` before embedding it.
- Recommendations: Render descriptions as escaped text or sanitize/allowlist Markdown features before invoking `MDC`; add a test for component/script-like payloads.

**Public event requests can trigger expensive refreshes:**
- Risk: A stale or missing cache causes a public GET to fetch both Portal endpoints; requesting `all` refreshes every configured community. Repeated requests can amplify upstream load and Worker work.
- Files: `server/api/events/index.get.ts`, `server/utils/portalEvents.ts`
- Current mitigation: Cache entries last seven days, fetches have a five-second timeout, and community names are selected from content rather than request input.
- Recommendations: Add refresh locking/stale-while-revalidate, rate limiting or platform protection, and a bounded refresh budget.

**Webhook replay and duplicate delivery handling is incomplete:**
- Risk: The five-minute timestamp window prevents old deliveries but there is no event-id deduplication; duplicate valid deliveries synchronously repeat a Portal refresh.
- Files: `server/api/events/webhook.post.ts`, `server/utils/portalEvents.ts`
- Current mitigation: HMAC-SHA256 covers the exact raw body and timestamp, and event/resource/action values are validated.
- Recommendations: Persist and expire processed webhook IDs if Portal supplies one, or coalesce refreshes per meetup to limit duplicate work.

**Webhook body size is not bounded:**
- Risk: `readRawBody` accepts a request body before parsing or rejecting its size, allowing an authenticated or unauthenticated attacker to consume memory with oversized requests.
- Files: `server/api/events/webhook.post.ts`
- Current mitigation: Requests must carry a configured secret and valid HMAC before refresh work occurs.
- Recommendations: Enforce a small body-size limit at the Worker/Nitro route boundary and reject oversized payloads before buffering where supported.

**External-link and browser-hardening gaps:**
- Risk: Social links open a new tab without an explicit `noopener noreferrer`, and no application-owned CSP/security-header policy is visible.
- Files: `app/components/SocialLinks.vue`, `nuxt.config.ts`
- Current mitigation: Partner and map external links include `rel="noopener noreferrer"`; social URL patterns are restricted to known schemes/hosts.
- Recommendations: Apply the same rel attributes to social links and define a tested CSP/security-header policy compatible with Nuxt, analytics, images, and Cloudflare.

## Performance Bottlenecks

**Author blocks repeat full collection queries:**
- Problem: Every `AuthorBlock` query loads all articles and communities, then filters locally.
- Files: `app/components/AuthorBlock.vue`, `app/pages/lide.vue`, `app/components/page/BlogArticle.vue`, `app/components/page/Community.vue`
- Cause: The async-data key includes each author ID, so a people page with many authors performs the same large collection scans repeatedly.
- Improvement path: Load shared author relationships once at the page/list boundary or add a projection/composable with an explicit shared cache key.

**All-community calendar refresh scales linearly with configured communities:**
- Problem: One stale community causes the all-calendar path to fetch full Portal datasets and write one cache entry per community.
- Files: `server/utils/portalEvents.ts`, `content/communities/`
- Cause: `needsRefresh` is global for the selection and `refreshPortalMeetups` processes every selected community.
- Improvement path: Refresh only stale communities where possible, coalesce concurrent refreshes, and keep the all-calendar response bounded if Portal data grows.

**Category filtering is a substring query:**
- Problem: Blog category pages use `LIKE '%category%'` against the serialized categories field.
- Files: `app/components/page/BlogCategory.vue`, `content.config.ts`
- Cause: Collection filtering does not compare an exact category array member.
- Improvement path: Use a supported exact array-membership query or filter a projected, bounded dataset with a precise comparison.

**Large interactive SVG component is tightly coupled:**
- Problem: Map rendering, pointer/pinch state, viewport sizing, accessibility, and animation occupy one 445-line component.
- Files: `app/components/CommunityMap.vue`, `app/utils/communityMap.ts`
- Cause: Most behavior is local and there is no focused browser/component coverage for pointer transitions or resize behavior.
- Improvement path: Keep the public component boundary stable, add interaction tests first, then isolate only proven complex pure/state logic.

## Fragile Areas

**Content route and redirect contract:**
- Files: `content.config.ts`, `shared/data/contentRouteSources.ts`, `scripts/validate-content-routes.ts`, `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue`, `shared/contentRedirectsModule.ts`
- Why fragile: Pages and communities share `/`, blog articles and categories share `/blog`, and redirects are generated from frontmatter during parsing. Ordering determines which matching record renders.
- Safe modification: Preserve collection prefixes and filename rules, run `npm test` and the content-route validator/build, and add collision fixtures for every new route shape.
- Test coverage: `tests/validateContentRoutes.test.ts` covers source collisions, but runtime route precedence and generated redirect rules are not browser-tested.

**Portal normalization and cache compatibility:**
- Files: `server/utils/portalEvents.ts`, `shared/types/portalEvents.ts`, `tests/portalEvents.test.ts`, `server/api/events/webhook.post.ts`
- Why fragile: The adapter depends on Portal field names, UTC wall-clock formatting, meetup portal links, cache shape, and a seven-day fallback policy.
- Safe modification: Preserve server-only normalization, test malformed upstream/cache rows and deletion webhooks, and verify cold/stale/error paths against a Worker-compatible storage adapter.
- Test coverage: Core normalization and webhook signature behavior are covered; HTTP handler behavior, concurrency, limits, and real Portal schema drift are not.

**Cloudflare/Node dependency boundary:**
- Files: `nuxt.config.ts`, `package.json`, `app/components/AuthorBlock.vue`, `nuxt.config.ts`
- Why fragile: Cloudflare uses `cloudflare_module`, while Nuxt Studio/IPX transitively brings `sharp`; the config aliases `sharp` to an unenv proxy. QR generation and development tooling still depend on Node-oriented packages.
- Safe modification: Run both standard and Cloudflare builds after dependency/config changes and avoid Node-native APIs in `server/` code.
- Test coverage: No committed deployment smoke test validates the generated Worker in an actual Cloudflare environment.

**Dependency vulnerabilities:**
- Files: `package.json`, `package-lock.json`
- Why fragile: `npm audit --omit=dev --audit-level=high` reports three high-severity `sharp` vulnerabilities through `nuxt-studio`/`ipx` and moderate `esbuild` findings through the dependency tree; the suggested forced fix includes breaking changes.
- Safe modification: Upgrade the owning dependency chains deliberately, run standard and Cloudflare builds, and review the resulting lockfile rather than applying `npm audit fix --force` blindly.
- Test coverage: No dependency/security audit is enforced by the visible GitHub workflows.

## Scaling Limits

**Content-backed list rendering:**
- Current capacity: The repository contains dozens of community records, 26 blog articles, and 11 people records at mapping time.
- Limit: `useDataCommunities()` and people/author views load complete collection records, while author relationships scan all articles and communities per author.
- Scaling path: Select only fields needed by each view, centralize relationship projections, and add pagination or bounded list queries before content volume grows substantially.

**Portal cache refresh:**
- Current capacity: One refresh fetches two complete Portal arrays and writes one cache record per selected community.
- Limit: A cold or stale `/api/events?community=all` request has work proportional to all communities and all upstream events, with no refresh lock or response-size bound.
- Scaling path: Add background/coalesced refresh, per-community freshness, and explicit event retention/response limits in `server/utils/portalEvents.ts`.

## Dependencies at Risk

**nuxt-studio media dependency chain:**
- Risk: `nuxt-studio` brings `ipx` and a vulnerable `sharp` version, while production cannot execute native `sharp` in Cloudflare Workers.
- Impact: Security advisories and future media changes can break either the editor or Worker build.
- Migration plan: Track upstream Nuxt Studio/IPX/sharp upgrades, validate the `sharp` alias and image behavior in `npm run build:cloudflare`, and consider disabling unused media functionality.

## Missing Critical Features

**Operational error visibility:**
- Problem: Application code has no structured error reporting or alerting; event failures are only logged with `console.error`.
- Blocks: Fast diagnosis of Portal outages, malformed content, and production rendering failures.
- Files: `server/api/events/index.get.ts`, `app/error.vue`, `app/plugins/counterscale.client.ts`

**Automated deployment/security gates:**
- Problem: Visible workflows cover temporary preview deployment/commenting but do not run the application test suite, typecheck, build guard, or dependency audit as a separate verification job.
- Blocks: Early detection of the current test/typecheck failures and vulnerable dependency regressions.
- Files: `.github/workflows/pr-preview.yml`, `.github/workflows/pr-preview-comment.yml`, `package.json`

## Test Coverage Gaps

**Nuxt route and rendered content behavior:**
- What's not tested: SSR/client rendering, catch-all route precedence, 404 error output, redirects, canonical links, and navigation placeholders.
- Files: `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue`, `app/error.vue`, `shared/contentRedirectsModule.ts`, `app/app.vue`
- Risk: Content can build while the wrong record or metadata is rendered.
- Priority: High

**Interactive UI behavior:**
- What's not tested: Map click/keyboard activation, pointer pan/pinch transitions, responsive height changes, modal QR generation, and calendar loading/error states.
- Files: `app/components/CommunityMap.vue`, `app/components/content/Calendar.vue`, `app/components/AuthorBlock.vue`
- Risk: Accessibility and mobile regressions can pass typechecking unnoticed.
- Priority: Medium

**HTTP security and integration boundaries:**
- What's not tested: Request-size limits, malformed headers, duplicate webhooks, handler status responses, stale-cache concurrency, and MDC handling of hostile descriptions.
- Files: `server/api/events/webhook.post.ts`, `server/api/events/index.get.ts`, `server/utils/portalEvents.ts`, `app/components/content/Calendar.vue`
- Risk: Abuse, privacy leakage, or upstream schema changes can affect production without a failing unit test.
- Priority: High

---

*Concerns audit: 2026-09-01*
