import { property, z } from '@nuxt/content'
import { defineSitemapSchema } from '@nuxtjs/sitemap/content'

export const communitySchema = z.object({
  seo: property(z.any().optional()).editor({ hidden: true }),
  navigation: property(z.any().optional()).editor({ hidden: true }),
  title: z.string(),
  region: z.string().trim().min(1),
  priority: z.number().int().nonnegative().optional(),
  map: property(z.object({
    lat: z.number().finite().min(48).max(52),
    lng: z.number().finite().min(12).max(19),
    zoom: z.number().finite().optional(),
  }).optional()).editor({ description: 'Najdi ideální souřadnice a zoom tak aby byly vidět všechny důležité body na mapě: https://labs.mapbox.com/location-helper/' }),
  signal_group: z.string().url(),
  portal_meetup_id: z.number().optional(),
  organizers: z.array(z.string()).optional(),
  sitemap: defineSitemapSchema(),
})
