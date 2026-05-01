import { Redis } from '@upstash/redis'
import IORedis from 'ioredis'
import { config } from './env.js'

export const redis = new Redis({
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN
})

// Upstash uses rediss://; plain redis:// (e.g. local Docker) must not force TLS.
const useTls = config.UPSTASH_REDIS_URL.startsWith('rediss://')
const opts = {
  ...(useTls ? { tls: {} } : {}),
  maxRetriesPerRequest: 3,
  retryStrategy: (t) => Math.min(t * 200, 3000)
}

export const redisPublisher = new IORedis(config.UPSTASH_REDIS_URL, opts)
export const redisSubscriber = new IORedis(config.UPSTASH_REDIS_URL, opts)

export async function testRedisConnection() {
  const pong = await redis.ping()
  console.log('[Redis] Upstash connected ✓', pong)
}
