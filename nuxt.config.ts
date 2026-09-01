const isPreviewDeploy = Boolean(process.env.PREVIEW_DEPLOY)

// Nitro 2's bundled Wrangler type predates traces, but it emits this object unchanged.
const cloudflareObservability = {
  enabled: false,
  head_sampling_rate: 1,
  logs: {
    enabled: true,
    head_sampling_rate: 1,
    persist: true,
    invocation_logs: true,
  },
  traces: {
    enabled: true,
    persist: true,
    head_sampling_rate: 1,
  },
}

export default defineNuxtConfig({
  buildDir: process.env.NUXT_BUILD_DIR || undefined,

  compatibilityDate: "2026-03-01",

  content: {
    _localDatabase: {
      type: 'sqlite',
      // SQLite writes are unreliable on the devcontainer's virtiofs workspace
      // mount, so local Content caches stay on the container filesystem.
      filename: '/tmp/jednadvacet-content.sqlite',
    },
    build: {
      transformers: [
        '~~/shared/blogArticlesTransformer',
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  modules: [
    '@nuxt/content',
    '@nuxt/ui',
    '@nuxt/image',
    '@nuxthub/core',
    '@nuxtjs/sitemap',
    '@vueuse/nuxt',
    './shared/contentRedirectsModule',
    'nuxt-studio'
  ],

  site: {
    url: 'https://jednadvacet.org',
    name: 'Jednadvacet',
  },

  runtimeConfig: {
    portalWebhookSecret: process.env.NUXT_PORTAL_WEBHOOK_SECRET,
  },

  sitemap: {
    // People have no standalone routes; everything else is content-backed.
    exclude: ['/_studio/**', '/debug/**', '/cntrsclc'],
  },

  hub: {
    db: 'sqlite',
  },

  image: {
    // PREVIEW_DEPLOY builds run on *.workers.dev, where the zone-scoped
    // /cdn-cgi/image/ endpoint does not exist — serve original images there.
    provider: process.env.NUXT_IMAGE_PROVIDER || (process.env.PREVIEW_DEPLOY ? 'none' : process.env.NODE_ENV === 'production' ? 'cloudflare' : 'ipx'),
    cloudflare: {
      baseURL: '/',
    },
  },

  nitro: {
    devStorage: {
      portalEvents: {
        driver: 'fs',
        base: '/tmp/jednadvacet-portal-events',
      },
    },
    storage: isPreviewDeploy
      ? {
          portalEvents: { driver: 'memory' },
        }
      : {
          portalEvents: {
            driver: 'cloudflare-kv-binding',
            binding: 'PORTAL_EVENT_SNAPSHOTS',
            base: 'portal-events:v3',
          },
        },
    alias: {
      'sharp': 'unenv/mock/proxy-cjs', // sharp can't run in Cloudflare Workers; pulled in transitively by nuxt-studio's IPX media handler
    },
    cloudflare: {
      deployConfig: true,
      nodeCompat: true,
      wrangler: {
        name: 'jednadvacetorg-web',
        assets: {
          html_handling: 'drop-trailing-slash',
        },
        // PR previews omit the prod database_id so the temp account auto-provisions
        // a fresh D1 (Nuxt Content reseeds it from dump.*.sql). See review apps in README.
        d1_databases: isPreviewDeploy
          ? [
              {
                binding: 'DB',
                database_name: 'web-preview',
              }
            ]
          : [
              {
                binding: 'DB',
                database_name: 'web',
                database_id: '76d271b2-5335-40ba-81dd-bf7e1ef79522'
              }
            ],
        // Temporary PR previews run in an unrelated Cloudflare account and
        // must never receive the production event snapshot namespace.
        kv_namespaces: isPreviewDeploy
          ? []
          : [
              {
                binding: 'PORTAL_EVENT_SNAPSHOTS',
                id: '5e0aa50166db40ae8414c83614dbae4d',
              },
            ],
        observability: cloudflareObservability,
      }
    },
    prerender: {
      routes: ['/'],
      ignore: ['/_studio'],
      crawlLinks: true,
    },
    preset: 'cloudflare_module',
  },

  routeRules: {
    '/cntrsclc': { proxy: { to: 'https://analytics.jednadvacet.org/collect' } }, // Mask tracker collect URL to avoid blockers.
    '/author/**': { redirect: { to: '/lide', statusCode: 301 } },
  },

  studio: {
    dev: true,
    repository: {
      provider: 'github',
      owner: 'Jednadvacetorg',
      repo: 'web',
      branch: process.env.STUDIO_BRANCH_NAME || 'master',
      private: false,
    },
  },

  vite: {
    server: {
      allowedHosts: true,
    },
  },
})
