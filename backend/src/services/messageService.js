import { Message } from '../models/Message.js'

export async function saveMessage(payload) {
  return Message.create(payload)
}

export async function listMessages(conversationId, limit = 50, before = null) {
  const filter = { conversationId }
  if (before) filter.createdAt = { $lt: new Date(before) }
  return Message.find(filter).sort({ createdAt: -1 }).limit(limit).lean()
}

export async function deleteMessage(messageId, userId) {
  const msg = await Message.findById(messageId)
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 })
  if (msg.senderId !== userId) throw Object.assign(new Error('Not your message'), { status: 403 })
  msg.deleted = true
  msg.ciphertext = ''
  msg.iv = ''
  msg.reactions = []
  await msg.save()
  return msg
}

export async function toggleReaction(messageId, userId, emoji) {
  const msg = await Message.findById(messageId)
  if (!msg || msg.deleted) throw Object.assign(new Error('Message not found'), { status: 404 })
  const idx = msg.reactions.findIndex((r) => r.userId === userId && r.emoji === emoji)
  if (idx >= 0) {
    msg.reactions.splice(idx, 1)
  } else {
    msg.reactions.push({ userId, emoji })
  }
  await msg.save()
  return msg.reactions
}

export async function markRead(conversationId, userId, lastMessageId) {
  await Message.updateMany(
    { conversationId, _id: { $lte: lastMessageId } },
    { $addToSet: { readBy: { userId, readAt: new Date() } } }
  )
}
