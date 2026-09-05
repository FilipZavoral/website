import type { NavigationMenuItem } from '@nuxt/ui'

export const supportNavigationItems = [
  { label: 'Další partneři', to: '/podporit#dalsi-partneri' },
  { label: 'Přispět', to: '/podporit#prispet' },
] satisfies NavigationMenuItem[]

export const navigationItems = [
  {
    label: 'Města',
    value: 'cities',
  },
  {
    label: 'Kalendář',
    value: 'calendar',
    to: '/kalendar',
  },
  {
    label: 'Podpořit a partneři',
    value: 'support',
    to: '/podporit',
    children: supportNavigationItems,
  },
  {
    label: 'Blog',
    value: 'blog',
    to: '/blog',
  },
  {
    label: 'Projekty',
    value: 'projects',
    children: [
      {
        label: 'Monument',
        description: 'Postavme Satoshimu sochu v Praze.',
        icon: 'i-lucide-pyramid',
        to: 'https://satoshi.jednadvacet.org/',
      },
      {
        label: 'Bitcoinová liga',
        description: 'Celoroční pubkvíz po celém Česku a Slovensku.',
        icon: 'i-lucide-trophy',
        to: '/liga',
      },
      {
        label: 'Bitcoin je mrtvý',
        description: 'Již 15 let sledujeme Bitcoin umírat',
        icon: 'i-streamline-christian-cross-2',
        to: 'https://mrtvy.jednadvacet.org',
      },
      {
        label: 'Získej financování',
        description: 'Pomůžeme tu najít sponzory tvého projektu.',
        to: '/finance',
      },
      {
        label: 'Lidé',
        description: 'Komunita, která stojí za Jednadvacet.',
        to: '/lide',
      },
    ],
  },
] satisfies NavigationMenuItem[]
