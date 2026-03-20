import { Message } from '../models/Message.js'

export async function saveMessage(payload) {
  return Message.create(payload)
}

export async function listMessages(conversationId, limit = 50) {
  return Message.find({ conversationId }).sort({ createdAt: -1 }).limit(limit).lean()
}
