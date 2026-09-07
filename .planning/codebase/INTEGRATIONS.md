---
last_mapped_commit: 406253b1b73b8ef1369805abfcfd98a6f3adb0d1
---
<!-- refreshed: 2026-09-01 -->
# External Integrations

**Analysis Date:** 2026-09-01

## APIs & External Services

**Community events:**
- Portal Einundzwanzig - supplies meetup metadata and meetup events to the public calendar.
  - SDK/Client: native Nuxt/Nitro `$fetch` passed to `server/utils/portalEvents.ts`.
  - Auth: public GET requests; change notifications use `NUXT_PORTAL_WEBHOOK_SECRET`.
  - Endpoints: `https://portal.einundzwanzig.space/api/meetups` and `https://portal.einundzwanzig.space/api/meetup-events`.

**Analytics:**
- Counterscale - browser page analytics initialized by `app/plugins/counterscale.client.ts`.
  - SDK/Client: `@counterscale/tracker`.
  - Auth: site identity is the current hostname; no application secret is configured.
  - Collection URL: `/cntrsclc`, proxied to `https://analytics.jednadvacet.org/collect` by `nuxt.config.ts` to reduce ad-blocker interference.

**Content editing and source control:**
- GitHub - Nuxt Studio uses the public `Jednadvacetorg/web` repository and selected branch for content editing (`nuxt.config.ts`).
  - SDK/Client: `nuxt-studio`.
  - Auth: managed by the Studio/GitHub integration; no application GitHub token is configured in source.

## Data Storage

**Databases:**
- SQLite through Nuxt Content - local content indexing/cache at `/tmp/jednadvacet-content.sqlite` (`nuxt.config.ts`).
  - Connection: local filesystem path, not an environment variable.
  - Client: `@nuxt/content` server query APIs and its configured SQLite adapter.
- Cloudflare D1 - production NuxtHub database binding `DB` (`nuxt.config.ts`).
  - Connection: generated Cloudflare binding; production database ID is configured in `nuxt.config.ts`, while previews intentionally omit it.
  - Client: `@nuxthub/core` with SQLite/Drizzle dependencies; no application-owned Drizzle schema is present.

**File Storage:**
- Local static files only for committed images and assets in `public/`; no runtime object-storage integration is configured.

**Caching:**
- Cloudflare KV namespace `PORTAL_EVENT_SNAPSHOTS` in production - durable per-community Portal event snapshots under the `portal-events:v3` base (`nuxt.config.ts`, `server/utils/portalEvents.ts`).
- Filesystem storage in development and in-memory storage for PR previews - configured under Nitro `devStorage` and `storage` in `nuxt.config.ts`.
- Cache policy: snapshots refresh when missing or at least seven days old; stale data may be served if refresh fails but a valid cached value exists (`server/utils/portalEvents.ts`).

## Authentication & Identity

**Auth Provider:**
- Custom HMAC webhook authentication - `server/api/events/webhook.post.ts` validates `x-portal-event`, `x-portal-timestamp`, and `x-portal-signature` using Web Crypto HMAC-SHA-256 and `NUXT_PORTAL_WEBHOOK_SECRET`.
- No end-user login, session, OAuth, or application identity provider is detected in `app/`, `server/`, or `nuxt.config.ts`.

## Monitoring & Observability

**Error Tracking:**
- Not detected. Application and Portal failures are surfaced through Nitro error responses and server `console.error` logging (`server/api/events/index.get.ts`).

**Logs:**
- Cloudflare Workers invocation logs and observability are enabled in the generated Wrangler configuration (`nuxt.config.ts`).
- Local/server failures use `console.error`; browser usage analytics is handled by Counterscale (`server/api/events/index.get.ts`, `app/plugins/counterscale.client.ts`).

## CI/CD & Deployment

**Hosting:**
- Cloudflare Workers production deployment using Nitro preset `cloudflare_module` (`nuxt.config.ts`).
- GitHub Actions creates temporary isolated Cloudflare PR previews with `PREVIEW_DEPLOY=1` and `npx wrangler deploy --temporary` (`.github/workflows/pr-preview.yml`).

**CI Pipeline:**
- `.github/workflows/pr-preview.yml` checks out code, installs with `npm ci`, builds with preview bindings, rejects production D1/KV identifiers, deploys, and uploads preview metadata.
- `.github/workflows/pr-preview-comment.yml` downloads validated metadata and uses `actions/github-script@v7` to create or update a sticky pull-request comment.

## Environment Configuration

**Required env vars:**
- `NUXT_PORTAL_WEBHOOK_SECRET` - required to accept signed Portal webhook notifications (`nuxt.config.ts`).
- `PPQ_API_KEY` - optional development-container/tooling credential documented by `.env.example`; it is not read by application code.
- `NUXT_IMAGE_PROVIDER`, `PREVIEW_DEPLOY`, `STUDIO_BRANCH_NAME`, and `NUXT_BUILD_DIR` - optional deployment/build overrides (`nuxt.config.ts`).

**Secrets location:**
- Local secrets are expected in the gitignored `.env` file (presence noted without reading contents); CI preview deployment intentionally operates without repository secrets (`.github/workflows/pr-preview.yml`).

## Webhooks & Callbacks

**Incoming:**
- `POST /api/events/webhook` - receives Portal `meetup.created`, `meetup.updated`, and `meetup.deleted` notifications, verifies the signed raw body, then refreshes the matching KV snapshot (`server/api/events/webhook.post.ts`).
- The webhook body is treated as a notification only; authoritative data is re-fetched from both Portal APIs (`server/api/events/webhook.post.ts`, `server/utils/portalEvents.ts`).

**Outgoing:**
- Server-side GET requests to Portal meetup and event APIs with a five-second timeout and no retries (`server/utils/portalEvents.ts`).
- Browser analytics requests are sent through `/cntrsclc` to Counterscale (`app/plugins/counterscale.client.ts`, `nuxt.config.ts`).
- Social, event, and author links navigate to third-party sites including Nostr, X, Facebook, Instagram, YouTube, GitHub, WhatsApp, and arbitrary HTTPS URLs according to `app/components/SocialLinks.vue`.
- Lightning donations use `lightning:` URI links and locally generated QR codes; no payment processor API is called (`app/components/DonateBlock.vue`, `app/components/PersonBlock.vue`).

---

*Integration audit: 2026-09-01*
