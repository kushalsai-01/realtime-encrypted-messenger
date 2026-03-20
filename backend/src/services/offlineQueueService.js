import { redis } from '../config/redis.js'

function key(userId) {
  return `offline:${userId}`
}

export async function queueMessage(userId, payload) {
  await redis.rpush(key(userId), JSON.stringify(payload))
}

export async function drainMessages(userId) {
  const items = await redis.lrange(key(userId), 0, -1)
  if (items.length) await redis.del(key(userId))
  return items.map((v) => JSON.parse(v))
}
