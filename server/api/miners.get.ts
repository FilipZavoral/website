import { createError, defineEventHandler } from 'h3'
import { getMiners } from '../utils/miners.ts'

export default defineEventHandler(async () => {
  try {
    return await getMiners(useStorage('miners'), $fetch)
  } catch (error) {
    console.error('Miner request failed', error)
    throw createError({
      statusCode: 503,
      statusMessage: import.meta.dev && error instanceof Error
        ? error.message
        : 'Miner data is unavailable',
    })
  }
})
