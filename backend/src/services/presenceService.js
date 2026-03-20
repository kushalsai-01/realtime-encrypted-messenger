import { redis } from '../config/redis.js'

const ttl = 60

export async function setOnline(userId, serverId) {
  await redis.set(`presence:${userId}`, serverId, { ex: ttl })
}

export async function setOffline(userId) {
  await redis.del(`presence:${userId}`)
}

export async function getPresence(userId) {
  return redis.get(`presence:${userId}`)
}
