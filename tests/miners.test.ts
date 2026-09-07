import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getMiners,
  minersCacheKey,
  MinersError,
  type MinersFetch,
  type MinersStorage,
} from '../server/utils/miners.ts'

const now = new Date('2026-09-04T12:00:00.000Z')

const storage = (values = new Map<string, unknown>()): MinersStorage => ({
  getItem: async key => values.get(key),
  setItem: async (key, value) => { values.set(key, value) },
})

const fetcher = (payload: unknown, calls: string[] = []): MinersFetch => async (url, options) => {
  calls.push(url)
  assert.deepEqual(options, { timeout: 5_000, retry: 0 })
  return payload
}

test('normalizes, allowlists and sorts miner data before caching it', async () => {
  const values = new Map<string, unknown>()
  const result = await getMiners(storage(values), fetcher({
    jezevec: { hash_rate_24h_GH: 565.28, state: 'ok', last_share: 123 },
    bodye: { hash_rate_24h_GH: 517.08, state: 'ok', private: 'discarded' },
  }), now)

  assert.deepEqual(result, [
    { name: 'jezevec', hashRate24hGh: 565.28, state: 'ok' },
    { name: 'bodye', hashRate24hGh: 517.08, state: 'ok' },
  ])
  assert.deepEqual(values.get(minersCacheKey), {
    miners: result,
    fetchedAt: now.toISOString(),
  })
})

test('uses a fresh snapshot without requesting the upstream source', async () => {
  const cached = [{ name: 'cached', hashRate24hGh: 21, state: 'ok' }]
  const values = new Map<string, unknown>([[minersCacheKey, {
    miners: cached,
    fetchedAt: '2026-09-04T11:59:30.000Z',
  }]])

  const result = await getMiners(storage(values), async () => assert.fail('fresh cache must not fetch'), now)
  assert.deepEqual(result, cached)
})

test('returns a stale snapshot when the upstream refresh fails', async () => {
  const cached = [{ name: 'cached', hashRate24hGh: 21, state: 'ok' }]
  const values = new Map<string, unknown>([[minersCacheKey, {
    miners: cached,
    fetchedAt: '2026-08-01T00:00:00.000Z',
  }]])

  const result = await getMiners(storage(values), async () => { throw new Error('offline') }, now)
  assert.deepEqual(result, cached)
})

test('rejects malformed upstream data when no valid snapshot exists', async () => {
  await assert.rejects(
    getMiners(storage(), fetcher({ miner: { hash_rate_24h_GH: 'fast', state: 'ok' } }), now),
    (error: unknown) => error instanceof MinersError,
  )
})
