import process from 'node:process'
import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'
let redis: Redis | null = null

try {
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1, // Fail fast to prevent request hangs when Redis is unavailable
    connectTimeout: 2000,
  })

  redis.on('error', (err) => {
    console.warn('[Redis] Connection or command error:', err.message)
  })
}
catch (err) {
  console.error('[Redis] Initialization error:', err)
}

export async function getCache(key: string): Promise<string | null> {
  if (!redis || redis.status !== 'ready')
    return null
  try {
    return await redis.get(key)
  }
  catch (err) {
    console.warn(`[Redis] Failed to get cache for key "${key}":`, err)
    return null
  }
}

export async function setCache(key: string, value: string, ttlSeconds = 3600): Promise<void> {
  if (!redis || redis.status !== 'ready')
    return
  try {
    await redis.set(key, value, 'EX', ttlSeconds)
  }
  catch (err) {
    console.warn(`[Redis] Failed to set cache for key "${key}":`, err)
  }
}

export async function delCache(key: string): Promise<void> {
  if (!redis || redis.status !== 'ready')
    return
  try {
    await redis.del(key)
  }
  catch (err) {
    console.warn(`[Redis] Failed to delete cache for key "${key}":`, err)
  }
}
