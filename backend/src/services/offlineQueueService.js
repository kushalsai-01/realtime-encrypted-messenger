import { redis } from '../config/redis.js'

function key(userId) {
  return `offline:${userId}`
}

export async function queueMessage(userId, payload) {
  await redis.rpush(key(userId), JSON.stringify(payload))
  // Cap the queue at 200 messages to prevent unbounded memory growth
  await redis.ltrim(key(userId), -200, -1)
}

// CRIT-4: Atomic drain using a Lua script — LRANGE + DEL in a single round-trip.
// Previously used two separate commands (lrange then del) which had a race condition:
// two pods could both drain the same user's queue, causing duplicate or lost messages.
// The Lua script runs atomically on the Redis server — no other command can interleave.
const DRAIN_SCRIPT = `
local key = KEYS[1]
local items = redis.call('LRANGE', key, 0, -1)
if #items > 0 then
  redis.call('DEL', key)
end
return items
`

export async function drainMessages(userId) {
  // @upstash/redis exposes eval() for Lua scripts
  const items = await redis.eval(DRAIN_SCRIPT, [key(userId)], [])
  if (!items || items.length === 0) return []
  return items.map((v) => JSON.parse(v))
}
