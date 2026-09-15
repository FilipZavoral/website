---
last_mapped_commit: 599ee9aa4c15c119dae17486c0f6ea5999b32b9e
last_mapped_at: 2026-09-15
---
# External Integrations

**Analysis Date:** 2026-09-15

## APIs & External Services

**Calendar and community events:**

- Portal Einundzwanzig - supplies meetup metadata and normalized event rows from `https://portal.einundzwanzig.space/api/meetups` and `https://portal.einundzwanzig.space/api/meetup-events?locale=cs` (`server/utils/portalEvents.ts`).
  - SDK/Client: native Fetch/$fetch with explicit timeout and runtime validation.
  - Auth: public reads use no credential; incoming change notifications use `NUXT_PORTAL_WEBHOOK_SECRET` HMAC-SHA-256 headers in `server/api/events/webhook.post.ts`.
- Portal webhooks - signed `POST /api/events/webhook` notifications are validated and sent to the `PORTAL_EVENTS_QUEUE` Cloudflare Queue; webhook bodies are not applied directly to public state (`server/api/events/webhook.post.ts`).

**Google Calendar:**

- Google OAuth and Calendar v3 - synchronizes Portal events into one integration-owned calendar (`server/utils/googleCalendar.ts`).
  - SDK/Client: native Fetch against `https://oauth2.googleapis.com/token` and `https://www.googleapis.com/calendar/v3`; deterministic SHA-256 event IDs and private extended properties identify owned events.
  - Auth: `NUXT_GOOGLE_OAUTH_CLIENT_ID`, `NUXT_GOOGLE_OAUTH_SECRET`, `NUXT_GOOGLE_OAUTH_REFRESH_TOKEN`, and `NUXT_GOOGLE_LEGACY_CALENDAR_ID` in `nuxt.config.ts`/`.env.example`.
  - Trigger: targeted Portal queue changes perform idempotent upserts/deletes; full scheduled refreshes reconcile managed future events in `server/plugins/portalEventsQueue.ts`.

**Maps and place data:**

- BeruBitcoin place API - returns Bitcoin-accepting place coordinates and payment capabilities from `https://mapa.berubitcoin.cz/api/places` (`server/utils/staticMap.ts`).
  - SDK/Client: native Fetch with manual redirect handling, size/content-type validation, and a 10-second timeout.
  - Auth: none detected.
- Mapbox Static Images API - renders WebP community hero maps from `https://api.mapbox.com/styles/v1/.../static/...` (`server/utils/staticMap.ts`).
  - SDK/Client: native Fetch and URL construction with GeoJSON overlays.
  - Auth: `NUXT_MAPBOX_ACCESS_TOKEN`; style defaults to `mapbox/dark-v10` and is configurable as `mapboxStyle` in `nuxt.config.ts`.
- OpenStreetMap, Mapbox, and BTC Map - attribution/outbound links are rendered in `app/components/page/Community.vue`; OpenStreetMap coordinates are used in calendar projections (`app/utils/calendar.ts`).

**Mining data:**

- WordPress-hosted miner snapshot - reads `https://jednadvacet.org/wp-content/uploads/filtered_workers.json` (`server/utils/miners.ts`).
  - SDK/Client: native `$fetch` with a 5-second timeout and runtime payload validation.
  - Auth: none detected.
  - Caching: last valid snapshot is stored in the Nitro `miners` storage mount for one-minute freshness and stale fallback.

**Analytics:**

- Counterscale - browser pageview and intent tracking through `@counterscale/tracker` (`app/plugins/counterscale.client.ts`).
  - SDK/Client: `Counterscale.init` and `trackPageview`.
  - Auth: no credential in application code; site ID is the current hostname.
  - Endpoint: `/cntrsclc` is proxied to `https://analytics.jednadvacet.org/collect` by the route rule in `nuxt.config.ts` to reduce ad-blocker interference.

## Data Storage

**Databases:**

- Nuxt Content local SQLite - content collections are materialized into `/tmp/jednadvacet-content.sqlite` during development (`nuxt.config.ts`).
  - Connection: framework-managed local file; not an application environment variable.
  - Client: `@nuxt/content` collection queries such as `queryCollection()` in `app/pages/` and `server/tasks/`.
- Cloudflare D1 SQLite - production Nuxt Content/NuxtHub database through the `DB` binding; production and preview binding definitions are generated in `nuxt.config.ts`.
  - Connection: Cloudflare binding, not a public connection string.
  - Client: `@nuxthub/core`, Nuxt Content, and installed Drizzle tooling.
- Drizzle/LibSQL support - `drizzle-orm`, `drizzle-kit`, `@libsql/client`, and SQLite drivers are installed in `package.json`; no standalone application schema or direct database service module is detected.

**Key-value and snapshots:**

- Cloudflare KV - production Nitro storage mount `portalEvents` uses `PORTAL_EVENT_SNAPSHOTS` with base `portal-events:v3`; `miners` uses the same binding with base `miners:v1` (`nuxt.config.ts`).
  - Client: Nitro `useStorage()` in `server/api/events/index.get.ts`, `server/routes/ical/[slug].get.ts`, and `server/api/miners.get.ts`.
  - Purpose: durable Portal community event snapshots, cancellation history, and miner fallback data.
- In-memory KV - preview deployments use memory storage for `miners` and `portalEvents`; local development uses filesystem-backed storage under `/tmp/jednadvacet-*` (`nuxt.config.ts`).

**File Storage:**

- Cloudflare R2 - production NuxtHub Blob binding `BLOB` stores generated map variants under `community-maps/v1/` (`nuxt.config.ts`, `server/plugins/communityMapsQueue.ts`).
  - Public production delivery uses `https://files.jednadvacet.org/community-maps/v1/...` in `app/components/page/Community.vue`.
  - Local development uses NuxtHub filesystem blob storage and `server/api/community-maps/[slug].get.ts`.
- Repository static assets - checked-in images/icons are served from `public/`, including blog, avatar, partner, and application assets.

**Caching:**

- Nitro storage snapshots and stale fallback only; no external cache service is detected.
- Cloudflare edge/assets caching is provided by the Worker deployment and R2/CDN path; application-level response caching is not explicitly configured.

## Authentication & Identity

**Auth Provider:**

- Custom shared-secret administration - `server/api/events/refresh.post.ts` accepts an `Authorization: Bearer` token checked by constant-time comparison against `NUXT_EVENTS_ADMIN_TOKEN` (`server/utils/eventsAdminAuth.ts`).
- Custom Portal webhook authentication - HMAC-SHA-256 over `timestamp.rawBody`, timestamp skew validation, delivery headers, and payload validation are implemented in `server/api/events/webhook.post.ts`.
- Google OAuth refresh-token flow - server-only access tokens are exchanged for Calendar API calls in `server/utils/googleCalendar.ts`.
- Nuxt Studio/GitHub - Studio is configured for the public `Jednadvacetorg/web` repository and branch selected by `STUDIO_BRANCH_NAME` (`nuxt.config.ts`); no custom auth implementation is present in this repository.

## Monitoring & Observability

**Error Tracking:**

- None detected. Runtime failures are surfaced through HTTP status responses, queue retries, and console logs.

**Logs:**

- `console.info`, `console.warn`, and `console.error` with subsystem prefixes are used by Portal, map, miner, and queue integrations (`server/utils/`, `server/plugins/`, `server/tasks/`).
- Cloudflare observability logs, invocation logs, and traces are emitted through the `cloudflareObservability` object in `nuxt.config.ts`; logs/traces are configured to persist with full head sampling, while the top-level observability enabled flag is false.
- Google error handling intentionally records operation/status/reason summaries without response bodies (`server/utils/googleCalendar.ts`).

## CI/CD & Deployment

**Hosting:**

- Cloudflare Workers production deployment using Nuxt Nitro and Wrangler (`nuxt.config.ts`, `package.json`).
- Temporary PR previews use `npx wrangler deploy --temporary` in an isolated Cloudflare account and publish a validated `workers.dev` URL (`.github/workflows/pr-preview.yml`, `.github/workflows/pr-preview-comment.yml`).

**CI Pipeline:**

- GitHub Actions workflow `.github/workflows/pr-preview.yml` checks out pull requests, installs with `npm ci`, builds with preview bindings, guards against production D1/KV/R2 leakage, deploys a temporary Worker, and uploads preview metadata.
- `.github/workflows/pr-preview-comment.yml` downloads and validates preview metadata, then uses `actions/github-script` with pull-request write permission to maintain a sticky PR comment.
- No independent test or typecheck workflow is detected.

## Environment Configuration

**Required env vars:**

- `NUXT_PORTAL_WEBHOOK_SECRET` - Portal webhook signature verification.
- `NUXT_GOOGLE_OAUTH_CLIENT_ID`, `NUXT_GOOGLE_OAUTH_SECRET`, `NUXT_GOOGLE_OAUTH_REFRESH_TOKEN`, `NUXT_GOOGLE_LEGACY_CALENDAR_ID` - Google Calendar synchronization.
- `NUXT_EVENTS_ADMIN_TOKEN` - authenticated manual refresh and map refresh operations.
- `NUXT_MAPBOX_ACCESS_TOKEN` - Mapbox Static Images API.
- `PPQ_API_KEY` - documented devcontainer/OpenCode tooling credential, not consumed by application source (`.env.example`).
- `PREVIEW_DEPLOY`, `NUXT_IMAGE_PROVIDER`, `NUXT_BUILD_DIR`, and `STUDIO_BRANCH_NAME` are optional build/deployment switches (`nuxt.config.ts`).

**Secrets location:**

- Local development uses ignored `.env`; only variable names are documented in `.env.example`.
- Production secrets are expected in Cloudflare Worker secret/runtime configuration as described in `README.md` and `.env.example`.
- GitHub preview deployment intentionally uses no Cloudflare secrets in the fork-safe `pull_request` workflow (`.github/workflows/pr-preview.yml`).

## Webhooks & Callbacks

**Incoming:**

- `POST /api/events/webhook` - Portal sends signed `meetup` and `meetup-event` created/updated/deleted notifications; the handler validates and queues change metadata (`server/api/events/webhook.post.ts`).
- Google does not call back into the application; Calendar operations are outbound reconciliation requests (`server/utils/googleCalendar.ts`).

**Outgoing:**

- Portal API reads - outbound event and meetup requests from `server/utils/portalEvents.ts`.
- Google OAuth token and Calendar API calls - outbound token exchange and event list/insert/update/delete requests from `server/utils/googleCalendar.ts`.
- BeruBitcoin and Mapbox requests - outbound map data/image generation from `server/utils/staticMap.ts`.
- Miner snapshot request - outbound WordPress JSON request from `server/utils/miners.ts`.
- Counterscale analytics - browser events sent through the `/cntrsclc` proxy route configured in `nuxt.config.ts`.

---

*Integration audit: 2026-09-15*
