import { Message } from '../models/Message.js'
import { queueMessage } from '../services/offlineQueueService.js'
import { setOnline, getPresence } from '../services/presenceService.js'
import { markRead } from '../services/messageService.js'
import { updateLastRead } from '../services/roomService.js'
import { getConnection } from './connectionManager.js'
import { publish } from './redisPubSub.js'
import { config } from '../config/env.js'

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload))
}

export async function routeMessage(ws, senderId, packet, wss) {
  const { type, payload = {} } = packet

  switch (type) {
    case 'message': {
      const { recipientId, conversationId, ciphertext, iv, replyToId } = payload
      if (!recipientId || !conversationId || !ciphertext || !iv) {
        send(ws, { type: 'error', message: 'Missing required fields' })
        return
      }
      const saved = await Message.create({
        senderId,
        recipientId,
        conversationId,
        ciphertext,
        iv,
        replyToId: replyToId || null
      })
      const event = {
        type: 'message',
        data: {
          id: String(saved._id),
          senderId,
          recipientId,
          conversationId,
          ciphertext,
          iv,
          replyToId: replyToId || null,
          createdAt: saved.createdAt,
          reactions: [],
          readBy: []
        }
      }
      const recipientSocket = getConnection(recipientId)
      if (recipientSocket && recipientSocket.readyState === recipientSocket.OPEN) {
        recipientSocket.send(JSON.stringify(event))
      } else {
        await queueMessage(recipientId, event.data)
      }
      send(ws, { type: 'message:sent', data: { id: String(saved._id) } })
      await publish({ ...event, targetUserId: recipientId })
      break
    }

    case 'typing:start': {
      const { conversationId } = payload
      if (!conversationId) return
      const recipientSocket = getRecipientInConversation(conversationId, senderId)
      if (recipientSocket) {
        send(recipientSocket, { type: 'typing:start', data: { userId: senderId, conversationId } })
      }
      break
    }

    case 'typing:stop': {
      const { conversationId } = payload
      if (!conversationId) return
      const recipientSocket = getRecipientInConversation(conversationId, senderId)
      if (recipientSocket) {
        send(recipientSocket, { type: 'typing:stop', data: { userId: senderId, conversationId } })
      }
      break
    }

    case 'messages:read': {
      const { conversationId, lastMessageId } = payload
      if (!conversationId || !lastMessageId) return
      await markRead(conversationId, senderId, lastMessageId)
      await updateLastRead(conversationId, senderId, lastMessageId)
      const recipientSocket = getRecipientInConversation(conversationId, senderId)
      if (recipientSocket) {
        send(recipientSocket, {
          type: 'messages:read',
          data: { userId: senderId, conversationId, lastMessageId }
        })
      }
      break
    }

    case 'heartbeat': {
      await setOnline(senderId, config.SERVER_ID)
      send(ws, { type: 'heartbeat:ack' })
      break
    }

    case 'presence:get': {
      const { userIds } = payload
      if (!Array.isArray(userIds)) return
      const statuses = await Promise.all(
        userIds.map(async (id) => ({
          userId: id,
          status: (await getPresence(id)) ? 'online' : 'offline'
        }))
      )
      send(ws, { type: 'presence:list', data: statuses })
      break
    }

    case 'message:reaction': {
      const { messageId, emoji } = payload
      if (!messageId || !emoji) return
      const msg = await Message.findById(messageId)
      if (!msg || msg.deleted) return
      const idx = msg.reactions.findIndex((r) => r.userId === senderId && r.emoji === emoji)
      if (idx >= 0) msg.reactions.splice(idx, 1)
      else msg.reactions.push({ userId: senderId, emoji })
      await msg.save()
      const recipientSocket = getConnection(msg.recipientId)
      const event = { type: 'message:reaction', data: { messageId, reactions: msg.reactions } }
      send(ws, event)
      if (recipientSocket) send(recipientSocket, event)
      break
    }

    case 'message:delete': {
      const { messageId } = payload
      if (!messageId) return
      const msg = await Message.findById(messageId)
      if (!msg || msg.senderId !== senderId) return
      msg.deleted = true
      msg.ciphertext = ''
      msg.iv = ''
      msg.reactions = []
      await msg.save()
      const recipientSocket = getConnection(msg.recipientId)
      const event = { type: 'message:deleted', data: { messageId: String(msg._id) } }
      send(ws, event)
      if (recipientSocket) send(recipientSocket, event)
      break
    }

    default:
      send(ws, { type: 'error', message: `Unknown event type: ${type}` })
  }
}

function getRecipientInConversation(conversationId, senderId) {
  const parts = conversationId.split(':')
  const recipientId = parts.find((p) => p !== senderId)
  if (!recipientId) return null
  return getConnection(recipientId) || null
}
