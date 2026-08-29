export const COMMUNITY_MAP_WIDTH = 1200
export const COMMUNITY_MAP_HEIGHT = 700
export const COMMUNITY_MAP_BOUNDS = {
  minLng: 11.25,
  maxLng: 19.75,
  minLat: 47.8,
  maxLat: 51.8,
} as const

export interface CommunityMapTransform {
  scale: number
  x: number
  y: number
}

export const projectCommunityCoordinate = (lng: number, lat: number) => ({
  x: (lng - COMMUNITY_MAP_BOUNDS.minLng) / (COMMUNITY_MAP_BOUNDS.maxLng - COMMUNITY_MAP_BOUNDS.minLng) * COMMUNITY_MAP_WIDTH,
  y: (COMMUNITY_MAP_BOUNDS.maxLat - lat) / (COMMUNITY_MAP_BOUNDS.maxLat - COMMUNITY_MAP_BOUNDS.minLat) * COMMUNITY_MAP_HEIGHT,
})

export const clampCommunityMapTransform = (transform: CommunityMapTransform): CommunityMapTransform => {
  const scale = Math.max(1, Math.min(5, transform.scale))
  return {
    scale,
    x: Math.max(COMMUNITY_MAP_WIDTH * (1 - scale), Math.min(0, transform.x)),
    y: Math.max(COMMUNITY_MAP_HEIGHT * (1 - scale), Math.min(0, transform.y)),
  }
}

export const centerCommunityMapOn = (x: number, y: number, scale = 5): CommunityMapTransform => {
  return clampCommunityMapTransform({
    scale,
    x: COMMUNITY_MAP_WIDTH / 2 - x * scale,
    y: COMMUNITY_MAP_HEIGHT / 2 - y * scale,
  })
}
