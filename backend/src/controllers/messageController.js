import * as messageService from '../services/messageService.js'
import { assertMember } from '../services/roomService.js'

export async function getMessages(req, res, next) {
  try {
    const { conversationId } = req.params
    const { before, limit } = req.query
    await assertMember(conversationId, req.user.sub)
    const messages = await messageService.listMessages(
      conversationId,
      Math.min(parseInt(limit) || 50, 100),
      before
    )
    res.json({ success: true, data: messages })
  } catch (err) {
    next(err)
  }
}

export async function sendMessage(req, res, next) {
  try {
    const { conversationId } = req.params
    const { ciphertext, iv, recipientId, replyToId } = req.body
    if (!ciphertext || !iv || !recipientId)
      return res.status(400).json({ error: 'ciphertext, iv, and recipientId are required' })
    await assertMember(conversationId, req.user.sub)
    const msg = await messageService.saveMessage({
      conversationId,
      senderId: req.user.sub,
      recipientId,
      ciphertext,
      iv,
      replyToId: replyToId || null
    })
    res.status(201).json({ success: true, data: msg })
  } catch (err) {
    next(err)
  }
}

export async function deleteMessage(req, res, next) {
  try {
    const msg = await messageService.deleteMessage(req.params.messageId, req.user.sub)
    res.json({ success: true, data: { id: String(msg._id), deleted: true } })
  } catch (err) {
    next(err)
  }
}

export async function reactToMessage(req, res, next) {
  try {
    const { messageId } = req.params
    const { emoji } = req.body
    if (!emoji) return res.status(400).json({ error: 'emoji is required' })
    const reactions = await messageService.toggleReaction(messageId, req.user.sub, emoji)
    res.json({ success: true, data: { reactions } })
  } catch (err) {
    next(err)
  }
}
