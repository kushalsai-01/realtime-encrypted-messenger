import { Redis } from '@upstash/redis'
import IORedis from 'ioredis'
import { config } from './env.js'

export const redis = new Redis({
  url: config.UPSTASH_REDIS_REST_URL,
  token: config.UPSTASH_REDIS_REST_TOKEN
})

const opts = {
  tls: {},
  maxRetriesPerRequest: 3,
  retryStrategy: (t) => Math.min(t * 200, 3000)
}

export const redisPublisher = new IORedis(config.UPSTASH_REDIS_URL, opts)
export const redisSubscriber = new IORedis(config.UPSTASH_REDIS_URL, opts)

export async function testRedisConnection() {
  const pong = await redis.ping()
  console.log('[Redis] Upstash connected ✓', pong)
}
