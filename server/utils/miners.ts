import type { Miner } from '../../shared/types/miners.ts'

const minersUrl = 'https://jednadvacet.org/wp-content/uploads/filtered_workers.json'
const maxCacheAgeMs = 60 * 1_000

export const minersCacheKey = 'snapshot:v1'

export interface MinersStorage {
  getItem(key: string): Promise<unknown>
  setItem(key: string, value: unknown): Promise<void>
}

export type MinersFetch = (url: string, options: { timeout: number, retry: number }) => Promise<unknown>

interface CachedMiners {
  miners: Miner[]
  fetchedAt: string
}

export class MinersError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isMiner = (value: unknown): value is Miner => isRecord(value)
  && typeof value.name === 'string'
  && value.name.length > 0
  && value.name.length <= 100
  && typeof value.hashRate24hGh === 'number'
  && Number.isFinite(value.hashRate24hGh)
  && value.hashRate24hGh >= 0
  && typeof value.state === 'string'
  && value.state.length > 0
  && value.state.length <= 32

const parsePayload = (value: unknown): Miner[] => {
  if (!isRecord(value)) throw new MinersError('Miner response is invalid')
  const entries = Object.entries(value)
  if (entries.length > 100) throw new MinersError('Miner response is too large')

  const miners = entries.map(([name, details]) => {
    if (!isRecord(details)) throw new MinersError('Miner row is invalid')
    const miner = {
      name,
      hashRate24hGh: details.hash_rate_24h_GH,
      state: details.state,
    }
    if (!isMiner(miner)) throw new MinersError('Miner row is invalid')
    return miner
  })

  return miners.sort((a, b) => b.hashRate24hGh - a.hashRate24hGh || a.name.localeCompare(b.name, 'cs'))
}

const parseCache = (value: unknown): CachedMiners | null => {
  if (!isRecord(value) || !Array.isArray(value.miners) || !value.miners.every(isMiner)
    || typeof value.fetchedAt !== 'string' || Number.isNaN(Date.parse(value.fetchedAt))) return null
  return {
    miners: value.miners,
    fetchedAt: new Date(value.fetchedAt).toISOString(),
  }
}

/** Returns fresh miner data, falling back to the last valid snapshot when refresh fails. */
export const getMiners = async (
  storage: MinersStorage,
  fetcher: MinersFetch,
  now = new Date(),
): Promise<Miner[]> => {
  const cached = parseCache(await storage.getItem(minersCacheKey))
  if (cached && now.getTime() - Date.parse(cached.fetchedAt) < maxCacheAgeMs) return cached.miners

  try {
    const miners = parsePayload(await fetcher(minersUrl, { timeout: 5_000, retry: 0 }))
    await storage.setItem(minersCacheKey, { miners, fetchedAt: now.toISOString() } satisfies CachedMiners)
    return miners
  } catch (error) {
    if (cached) return cached.miners
    throw error instanceof MinersError ? error : new MinersError('Miner refresh failed')
  }
}
