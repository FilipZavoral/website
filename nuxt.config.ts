export default defineNuxtConfig({
  compatibilityDate: "2026-03-01",

  content: {
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
    '@vueuse/nuxt',
    './shared/contentRedirectsModule',
    'nuxt-studio'
  ],

  hub: {
    db: 'sqlite',
  },

  image: {
    provider: process.env.NUXT_IMAGE_PROVIDER || (process.env.NODE_ENV === 'production' ? 'cloudflare' : 'ipx'),
    cloudflare: {
      baseURL: '/',
    },
  },

  nitro: {
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
        // For ephemeral PR review apps (`wrangler deploy --temporary`) we must NOT
        // reference the production database_id, as it does not exist in the
        // throwaway temporary account. Leaving the binding without an id makes it a
        // "draft" binding that Wrangler auto-provisions as a fresh, isolated D1.
        // Nuxt Content then self-seeds it from the public dump.*.sql assets at runtime.
        d1_databases: process.env.PREVIEW_DEPLOY
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
        observability: {
          enabled: true,
          logs: {
            enabled: true,
            invocation_logs: true,
          },
        },
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
