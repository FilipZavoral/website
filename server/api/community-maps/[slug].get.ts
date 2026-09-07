import { blob } from 'hub:blob'

export default defineEventHandler((event) => {
  // Production serves these public objects directly from R2/CDN; this route only exposes local Blob storage.
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Only for local development' })
  }

  const slug = getRouterParam(event, 'slug') ?? ''
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'Community map not found' })
  }

  return blob.serve(event, `community-maps/v1/${slug}.webp`)
})
