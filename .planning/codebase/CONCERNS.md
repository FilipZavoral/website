---
last_mapped_commit: 599ee9aa4c15c119dae17486c0f6ea5999b32b9e
last_mapped_at: 2026-09-15
---
# Codebase Concerns

**Analysis Date:** 2026-09-15

## Tech Debt

**Weak content and extension typing:**

- Issue: The content schema accepts arbitrary blog frontmatter with `.passthrough()` and uses `z.any()` for SEO/navigation metadata. The custom transformer and module also use `any` at framework boundaries.
- Files: `content.config.ts`, `shared/blogArticlesTransformer.ts`, `shared/contentRedirectsModule.ts`
- Impact: Invalid metadata can reach templates, sitemap generation, or redirects without a build-time failure; framework upgrades are harder to type-check safely.
- Fix approach: Define the supported metadata shape explicitly, type the Nuxt Content hook context, and keep passthrough only for fields with a documented consumer.

**Duplicated and legacy repository payload:**

- Issue: The repository contains a full legacy static export and WordPress assets alongside the active Nuxt source, including `old.jednadvacet.org/` and `jednadvacet.org/`. macOS `.DS_Store` files are also present in source directories.
- Files: `old.jednadvacet.org/`, `jednadvacet.org/`, `.DS_Store`, `app/.DS_Store`, `content/.DS_Store`
- Impact: Repository clones, searches, backups, and review context are unnecessarily large; stale copies can be mistaken for deployable source.
- Fix approach: Move archival exports outside the application repository or document a deliberate archive boundary, remove generated metadata files, and enforce this with `.gitignore` and a repository hygiene check.

**Deployment configuration is concentrated in one large file:**

- Issue: Runtime bindings, queues, preview isolation, image providers, storage, redirects, sitemap exclusions, Studio, and Cloudflare deployment settings are all coupled in `nuxt.config.ts`.
- Files: `nuxt.config.ts`
- Impact: A change for one environment can silently alter another, and configuration regressions are difficult to review or test independently.
- Fix approach: Extract small typed configuration helpers for environment selection and generated Cloudflare bindings, then add assertions for preview isolation and required production bindings.

## Known Bugs

**Calendar data is fetched twice on initial browser render:**

- Symptoms: `Calendar.vue` uses SSR-aware `useFetch` and then calls `refresh()` again from `onMounted`, producing an unnecessary duplicate `/api/events` request for every calendar page visit.
- Files: `app/components/content/Calendar.vue`
- Trigger: Load any community page in a browser with the SSR payload available.
- Workaround: None in the application; remove the unconditional mount refresh or make it conditional on missing/stale data.

**Future notification controls are non-functional:**

- Symptoms: SMS, email, and web-notification buttons only track analytics and display a “not ready” alert; entered phone numbers and email addresses are persisted in browser local storage but never submitted.
- Files: `app/components/content/SubscriptionGuide.vue`
- Trigger: Select a community and activate any of the three notification methods.
- Workaround: Use the generated iCalendar URL instead.

**Production community-map availability depends on a hard-coded public host:**

- Symptoms: Production hero images are assembled from `https://files.jednadvacet.org`, while local development uses a separate API route. A CDN hostname or storage layout change requires a code deployment.
- Files: `app/components/page/Community.vue`, `nuxt.config.ts`, `server/api/community-maps/[slug].get.ts`
- Trigger: Change the R2/CDN hostname, deploy a different environment, or serve a preview through a host that does not expose the configured CDN.
- Workaround: Reconfigure the application and regenerate map objects together.

## Security Considerations

**Administrative credential in a query string:**

- Risk: `GET /api/community-maps/refresh?token=...` places the admin token in browser history, proxy logs, analytics, cache keys, and copied URLs. The endpoint also uses GET for a mutating enqueue operation.
- Files: `server/api/community-maps/refresh.get.ts`, `server/utils/eventsAdminAuth.ts`, `README.md`
- Current mitigation: The token is compared without revealing whether configuration is missing, and responses are marked `no-store`.
- Recommendations: Change the route to POST and accept the same Bearer header as `server/api/events/refresh.post.ts`; rotate the token after any query-string use and add rate limiting or Cloudflare Access protection.

**Production Studio/editor surface is enabled by configuration:**

- Risk: `nuxt-studio` is enabled with `studio.dev: true`, its route is explicitly run through the Worker, and the repository is configured as public. Any authentication or publishing misconfiguration exposes a write-capable administrative surface.
- Files: `nuxt.config.ts`, `shared/contentRedirectsModule.ts`
- Current mitigation: Studio paths are excluded from the sitemap and the module supplies repository metadata.
- Recommendations: Make production Studio enablement explicit, verify authentication and branch protections in deployment, and add an integration check that unauthenticated `/_studio` requests cannot edit or publish.

**External content is rendered in rich-content components without a local trust boundary:**

- Risk: Portal event descriptions are accepted from an external API and passed to `MDCCached`; malformed or newly introduced markup could become an XSS or unsafe-component issue if renderer sanitization changes.
- Files: `server/utils/portalEvents.ts`, `app/components/content/Calendar.vue`, `content.config.ts`
- Current mitigation: Event fields are normalized and links are allowlisted to `http`, `https`, `mailto`, and `tel`; JSON-LD escapes `<` in `app/utils/calendar.ts`.
- Recommendations: Treat descriptions as plain text or explicitly sanitize/allowlist rendered MDC, cap text lengths, and add a browser-level test for hostile HTML and URLs.

**Secrets and third-party access are not validated at deployment time:**

- Risk: Missing Portal, Mapbox, Google OAuth, or event-admin secrets cause runtime queue failures; incorrect secret rotation can leave integrations silently stale.
- Files: `nuxt.config.ts`, `.env.example`, `server/utils/googleCalendar.ts`, `server/utils/staticMap.ts`, `server/api/events/webhook.post.ts`
- Current mitigation: Individual integrations reject empty configuration before performing some external work, and `.env.example` documents secret names.
- Recommendations: Add a production startup/health check that verifies required bindings and secrets without logging values, and alert on repeated queue failures.

## Performance Bottlenecks

**People pages perform repeated full-collection queries:**

- Problem: Each `PersonBlock` loads all blog articles and all communities, then filters locally. The people listing renders one `PersonBlock` per person.
- Files: `app/components/PersonBlock.vue`, `app/pages/lide.vue`
- Cause: Related content is queried independently inside every component rather than projected once for the page.
- Improvement path: Fetch people and relationship indexes once in `app/pages/lide.vue`, pass each block only its related records, and use a dedicated projection only if more than one page needs it.

**Map refresh repeats the same upstream places request per community:**

- Problem: A scheduled refresh enqueues every community separately; every queue message calls `generateCommunityMaps`, which fetches BeruBitcoin places once for that community.
- Files: `server/tasks/community-maps.ts`, `server/plugins/communityMapsQueue.ts`, `server/utils/staticMap.ts`
- Cause: Queue isolation is per community and there is no refresh-batch cache or shared places snapshot.
- Improvement path: Fetch and validate the places dataset once per scheduled task, pass it through queue payload/storage, or generate all variants in one consumer invocation while preserving retry boundaries.

**All-community reads scale with every stored snapshot and event:**

- Problem: The public `all` events endpoint and all-community iCalendar feed enumerate every `community:*` key and load every snapshot into memory before serializing the response.
- Files: `server/utils/portalEvents.ts`, `server/api/events/index.get.ts`, `server/routes/ical/[slug].get.ts`
- Cause: KV snapshots are independently stored but aggregation is unbounded; there is no response cache, event-count limit, or payload budget.
- Improvement path: Add bounded snapshot sizes and response caching, measure serialized payload limits, and consider a materialized all-community snapshot for the public read path.

**Large static assets increase build and deployment cost:**

- Problem: `public/` is approximately 43 MB, with several multi-megabyte blog images, while legacy exports add roughly 110 MB more.
- Files: `public/images/`, `old.jednadvacet.org/`, `jednadvacet.org/`
- Cause: Source-sized images and archival static files remain in the deploy repository; only some images use Nuxt Image transformations.
- Improvement path: Optimize and dimension source images, remove unused exports from the deploy tree, and verify that production builds do not package archival content.

## Fragile Areas

**Portal snapshot consistency and queue ordering:**

- Files: `server/utils/portalEvents.ts`, `server/plugins/portalEventsQueue.ts`, `server/utils/portalEventsQueue.ts`
- Why fragile: Writer-side validation is strict, but `parseCacheForRead` trusts any object with the matching schema version. Queue processing relies on sequence numbers and KV visibility while comments acknowledge that KV is not strongly consistent.
- Safe modification: Preserve sequence coalescing and snapshot replacement semantics, validate read payloads with the same schema as writes, and test duplicate, out-of-order, partial, and concurrent deliveries.
- Test coverage: `tests/portalEvents.test.ts` covers many refresh cases, but there is no end-to-end Cloudflare KV/queue consistency test.

**Google Calendar reconciliation is a large external side effect:**

- Files: `server/utils/googleCalendar.ts`, `server/plugins/portalEventsQueue.ts`
- Why fragile: A full refresh lists all integration-owned events, performs many writes/deletes, and can fail after partial completion. Queue retries then repeat operations against an external API.
- Safe modification: Keep stable deterministic event IDs and idempotent PUT/DELETE behavior, preserve rate-limit stopping, and record a durable reconciliation cursor or report before changing operation ordering.
- Test coverage: `tests/googleCalendar.test.ts` covers request behavior and failure summaries, but not partial retry behavior against a real or emulated queue.

**Cloudflare-specific runtime shims:**

- Files: `nuxt.config.ts`, `package.json`
- Why fragile: `nodeCompat: true` and the `sharp` alias to `unenv/mock/proxy-cjs` compensate for transitive Nuxt Studio/IPX behavior in Workers. A dependency upgrade can reintroduce Node-only imports or break image/editor routes.
- Safe modification: Run both `npm run build` and `npm run build:cloudflare`, inspect generated Worker imports, and verify `/_studio`, image, API, queue, and scheduled-task paths after upgrades.
- Test coverage: Unit tests do not execute the generated Worker bundle.

**Interactive SVG map pointer state:**

- Files: `app/components/CommunityMap.vue`, `app/utils/communityMap.ts`
- Why fragile: Pointer capture, pinch state, SVG screen matrices, responsive height, and route navigation are coordinated through mutable state and browser-only geometry APIs.
- Safe modification: Preserve reset behavior on cancellation/unmount, test mouse, keyboard, touch, reduced-motion, and narrow portrait layouts in a browser rather than relying on typecheck.
- Test coverage: `tests/communityProjection.test.ts` covers data projection, but there is no component/browser interaction test for map gestures or link activation.

**Public routing and redirect hooks:**

- Files: `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue`, `shared/contentRedirectsModule.ts`, `scripts/validate-content-routes.ts`
- Why fragile: Pages and communities share the root namespace, blog collections share `/blog`, and redirects are added dynamically during content parsing. Route collisions can make valid content unreachable even when Nuxt itself builds.
- Safe modification: Run `npm run build` after content or routing changes, keep `scripts/validate-content-routes.ts` aligned with Nuxt Content path derivation, and test redirect status/location behavior.
- Test coverage: `tests/validateContentRoutes.test.ts` covers source collisions, but redirect hook behavior and actual SSR route precedence are not tested.

## Scaling Limits

**Portal queue and external API throughput:**

- Current capacity: Portal queue consumption is configured with `max_batch_size: 100`, `max_concurrency: 1`, and three retries; community-map consumption allows four concurrent jobs.
- Limit: Each Portal refresh fetches two external endpoints and can trigger multiple Google operations; each map job fetches places and three images. Backlogs or provider rate limits can extend beyond the daily schedule.
- Scaling path: Add dead-letter queues, provider-aware backoff, metrics for queue age/failure count, and a batch-level places snapshot. Review Cloudflare subrequest and execution limits before increasing concurrency.

**Unbounded event and content relationship payloads:**

- Current capacity: `readSelectedCaches('all')` loads every community snapshot, and each `PersonBlock` loads all article/community relationships.
- Limit: Memory, serialization time, and response size grow with community count, event history, and editorial content.
- Scaling path: Bound snapshot/event retention and response size, precompute relationship projections, and paginate or cache aggregate public responses.

## Dependencies at Risk

**Nuxt Studio and Worker image stack:**

- Risk: The application depends on `nuxt-studio` and compensates for its transitive image handling with a mocked `sharp` alias, while production uses a Cloudflare Worker preset.
- Impact: Studio media routes or production builds can fail after module upgrades, potentially affecting both publishing and deployment.
- Migration plan: Pin and review upgrade diffs, maintain a minimal production route smoke test, and replace the shim with a Worker-compatible image path when the dependency supports it.

## Missing Critical Features

**Queue dead-letter and operational recovery:**

- Problem: The Portal queue configuration explicitly has no DLQ; messages that fail after retries are discarded, and map/Portal failures depend on logs for discovery.
- Blocks: Reliable recovery from malformed provider responses, Google outages, or persistent configuration errors.

**Automated quality gates in CI:**

- Problem: The visible GitHub workflows build and deploy temporary previews but do not run `npm test` or `npm run typecheck` as independent required checks.
- Blocks: Regression detection for server utilities, route validation, and generated types before preview deployment.

**Real notification subscriptions:**

- Problem: The UI exposes SMS, email, and browser-notification choices but has no server route, persistence, consent flow, delivery provider, unsubscribe path, or retention policy.
- Blocks: Any notification method other than user-managed iCalendar subscriptions.

## Test Coverage Gaps

**SSR, hydration, and client navigation:**

- What's not tested: Duplicate fetch behavior, head/canonical metadata, error rendering, content route precedence, and hydration of `Calendar.vue`, `CommunityMap.vue`, and `SubscriptionGuide.vue`.
- Files: `app/app.vue`, `app/pages/[...slug].vue`, `app/pages/blog/[[slug]].vue`, `app/components/content/Calendar.vue`, `app/components/CommunityMap.vue`
- Risk: Browser-only regressions can pass all current server utility tests.
- Priority: High

**Administrative endpoint and webhook integration boundaries:**

- What's not tested: Actual HTTP method/header behavior, request-body size limits, replay/deduplication, queue-unavailable responses, and production runtime bindings.
- Files: `server/api/events/webhook.post.ts`, `server/api/events/refresh.post.ts`, `server/api/community-maps/refresh.get.ts`
- Risk: Authentication or deployment wiring can regress without the pure helper tests detecting it.
- Priority: High

**Generated Cloudflare bundle and scheduled tasks:**

- What's not tested: Queue consumer registration, cron task execution, KV/R2 bindings, preview isolation, and Worker-compatible imports.
- Files: `nuxt.config.ts`, `server/plugins/portalEventsQueue.ts`, `server/plugins/communityMapsQueue.ts`, `server/tasks/portal-events.ts`, `server/tasks/community-maps.ts`
- Risk: Production-only failures appear after deployment and may leave public snapshots stale.
- Priority: High

**Content integrity and relationship references:**

- What's not tested: Missing author/category/organizer references, malformed frontmatter accepted by passthrough schemas, external link safety, and invalid image paths.
- Files: `content.config.ts`, `content/`, `app/components/PersonBlock.vue`, `app/components/CategoriesBadges.vue`, `app/components/SocialLinks.vue`
- Risk: Editorial mistakes produce broken pages, missing relationships, or unsafe outbound links.
- Priority: Medium

---

*Concerns audit: 2026-09-15*
