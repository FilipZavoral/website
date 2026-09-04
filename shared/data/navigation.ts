import type { NavigationMenuItem } from '@nuxt/ui'

export const supportNavigationItems = [
  { label: 'Další partneři', to: '/podporit#partneri' },
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
        label: 'Medojedíci',
        description: 'Sbírej placky unikátní pro každou akci.',
        icon: 'i-lucide-bug',
        to: '/medojedici',
      },
      {
        label: 'Bitcoinová liga',
        description: 'Celoroční pubkvíz po celém Česku a Slovensku.',
        icon: 'i-lucide-trophy',
        to: '/liga',
      },
      {
        label: 'Získej financování',
        description: 'Pomůžeme tu najít sponzory tvého projektu.',
        icon: 'i-lucide-hand-coins',
        to: '/finance',
      },
      {
        label: 'Lidé',
        description: 'Komunita, která stojí za Jednadvacet.',
        icon: 'i-lucide-users',
        to: '/lide',
      },
    ],
  },
] satisfies NavigationMenuItem[]
