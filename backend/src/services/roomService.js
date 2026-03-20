import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/database.js'
import { Message } from '../models/Message.js'

export async function createRoom(name, createdBy) {
  const id = uuidv4()
  await query(
    'INSERT INTO rooms (id, name, is_direct, created_by) VALUES ($1, $2, FALSE, $3)',
    [id, name, createdBy]
  )
  await query('INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)', [
    id, createdBy, 'admin'
  ])
  return getRoom(id, createdBy)
}

export async function createDM(userAId, userBId) {
  const existing = await query(
    `SELECT r.id FROM rooms r
     JOIN room_members ma ON ma.room_id = r.id AND ma.user_id = $1
     JOIN room_members mb ON mb.room_id = r.id AND mb.user_id = $2
     WHERE r.is_direct = TRUE LIMIT 1`,
    [userAId, userBId]
  )
  if (existing.rowCount > 0) return getRoom(existing.rows[0].id, userAId)

  const id = uuidv4()
  await query('INSERT INTO rooms (id, is_direct, created_by) VALUES ($1, TRUE, $2)', [id, userAId])
  await query(
    'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3), ($1, $4, $3)',
    [id, userAId, 'member', userBId]
  )
  return getRoom(id, userAId)
}

export async function listRooms(userId) {
  const result = await query(
    `SELECT r.id, r.name, r.is_direct, r.created_at,
            rm.last_read_message_id, rm.last_read_at
     FROM rooms r
     JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  )
  return result.rows
}

export async function getRoom(roomId, userId) {
  const result = await query(
    `SELECT r.id, r.name, r.is_direct, r.created_at,
            rm.role, rm.last_read_message_id
     FROM rooms r
     JOIN room_members rm ON rm.room_id = r.id AND rm.user_id = $1
     WHERE r.id = $2`,
    [userId, roomId]
  )
  if (result.rowCount === 0) throw Object.assign(new Error('Room not found'), { status: 404 })
  return result.rows[0]
}

export async function getRoomMembers(roomId) {
  const result = await query(
    `SELECT u.id, u.email, u.display_name, rm.role, rm.joined_at
     FROM room_members rm
     JOIN users u ON u.id = rm.user_id
     WHERE rm.room_id = $1`,
    [roomId]
  )
  return result.rows
}

export async function assertMember(roomId, userId) {
  const result = await query(
    'SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 LIMIT 1',
    [roomId, userId]
  )
  if (result.rowCount === 0) throw Object.assign(new Error('Not a room member'), { status: 403 })
}

export async function addMember(roomId, targetUserId, requesterId) {
  const adminCheck = await query(
    "SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 AND role = 'admin' LIMIT 1",
    [roomId, requesterId]
  )
  if (adminCheck.rowCount === 0) throw Object.assign(new Error('Admin only'), { status: 403 })
  await query(
    'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [roomId, targetUserId]
  )
}

export async function removeMember(roomId, targetUserId, requesterId) {
  const adminCheck = await query(
    "SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2 AND role = 'admin' LIMIT 1",
    [roomId, requesterId]
  )
  if (adminCheck.rowCount === 0 && requesterId !== targetUserId)
    throw Object.assign(new Error('Admin only'), { status: 403 })
  await query('DELETE FROM room_members WHERE room_id = $1 AND user_id = $2', [
    roomId, targetUserId
  ])
}

export async function getUnreadCount(conversationId, userId, lastReadMessageId) {
  if (!lastReadMessageId) return await Message.countDocuments({ conversationId, senderId: { $ne: userId } })
  const lastRead = await Message.findById(lastReadMessageId)
  if (!lastRead) return 0
  return Message.countDocuments({
    conversationId,
    senderId: { $ne: userId },
    createdAt: { $gt: lastRead.createdAt }
  })
}

export async function updateLastRead(roomId, userId, lastMessageId) {
  await query(
    `UPDATE room_members SET last_read_message_id = $1, last_read_at = NOW()
     WHERE room_id = $2 AND user_id = $3`,
    [lastMessageId, roomId, userId]
  )
}
