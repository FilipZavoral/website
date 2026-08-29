export const useDataBlogCategories = () => {
  return useAsyncData('blog-categories', () => {
    return queryCollection('blogCategories')
      .order('id', 'ASC')
      .select('path', 'title')
      .all()
  })
}

export const useArticleCategories = (categoriesStems?: string[]) => {
  const { data: blogCategories } = useDataBlogCategories()
  return computed(() => {
    if (!categoriesStems?.length) return blogCategories.value ?? []
    return blogCategories.value?.filter(category => categoriesStems.includes(category.path.substring(6)))
  })
}

export const useDataCommunities = () => {
  return useAsyncData('communities', () => {
    return queryCollection('communities')
      .all()
  })
}

export interface CommunitySummary {
  path: string
  title: string
  region: string
  priority?: number | string | null
}

export interface CommunityRegionGroup {
  region: string
  communities: CommunitySummary[]
}

export interface CommunityProjection {
  regions: CommunityRegionGroup[]
}

const czechCollator = new Intl.Collator('cs')

export const projectCommunities = (items: readonly CommunitySummary[]): CommunityProjection => {
  const grouped = items.reduce<Map<string, CommunitySummary[]>>((groups, item) => {
    const communities = groups.get(item.region) ?? []
    communities.push(item)
    groups.set(item.region, communities)
    return groups
  }, new Map())

  const regions = Array.from(grouped, ([region, communities]) => ({
    region,
    communities: communities.slice().sort((a, b) =>
      czechCollator.compare(a.title, b.title) || a.path.localeCompare(b.path)),
  })).sort((a, b) => czechCollator.compare(a.region, b.region))

  return { regions }
}

export const useCommunityProjection = async () => {
  const { data, error } = await useDataCommunities()
  const projection = computed(() => projectCommunities(data.value ?? []))

  return { data, error, projection }
}
