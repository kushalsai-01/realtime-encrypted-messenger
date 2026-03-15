import { randomBytes } from 'crypto'
import redis from './redis-client.js'

const ROOM_TTL_SECONDS = 86400

function generateRoomCode() {
  const bytes = randomBytes(3)
  const num = ((bytes[0] << 16) | (bytes[1] << 8) | bytes[2]) % 900000 + 100000
  return num.toString()
}

export async function createRoom(creatorId) {
  let code
  let attempts = 0
  do {
    code = generateRoomCode()
    attempts++
    if (attempts > 10) throw new Error('Could not generate unique room code')
  } while (await redis.exists(`room:${code}`))

  const room = {
    code,
    createdAt: Date.now(),
    creatorId,
    members: [creatorId],
    status: 'waiting'
  }

  await redis.setEx(`room:${code}`, ROOM_TTL_SECONDS, JSON.stringify(room))
  await redis.setEx(`user:${creatorId}:room`, ROOM_TTL_SECONDS, code)

  return room
}

export async function joinRoom(code, userId) {
  const raw = await redis.get(`room:${code}`)
  if (!raw) return { error: 'Room not found or expired' }

  const room = JSON.parse(raw)
  if (room.members.length >= 2) return { error: 'Room is full' }
  if (room.members.includes(userId)) return { error: 'Already in room' }

  room.members.push(userId)
  room.status = 'active'

  await redis.setEx(`room:${code}`, ROOM_TTL_SECONDS, JSON.stringify(room))
  await redis.setEx(`user:${userId}:room`, ROOM_TTL_SECONDS, code)

  return room
}

export async function getRoom(code) {
  const raw = await redis.get(`room:${code}`)
  return raw ? JSON.parse(raw) : null
}

export async function removeFromRoom(code, userId) {
  const raw = await redis.get(`room:${code}`)
  if (!raw) return

  const room = JSON.parse(raw)
  room.members = room.members.filter((id) => id !== userId)

  if (room.members.length === 0) {
    await redis.del(`room:${code}`)
    console.log(`Room ${code} destroyed`)
  } else {
    room.status = 'waiting'
    await redis.setEx(`room:${code}`, ROOM_TTL_SECONDS, JSON.stringify(room))
  }

  await redis.del(`user:${userId}:room`)
}
