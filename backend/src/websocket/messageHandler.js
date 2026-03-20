import { Message } from '../models/Message.js'
import { queueMessage } from '../services/offlineQueueService.js'
import { getConnection } from './connectionManager.js'
import { publish } from './redisPubSub.js'

export async function handleSocketMessage(senderId, payload) {
  const { recipientId, conversationId, ciphertext, iv } = payload
  if (!recipientId || !conversationId || !ciphertext || !iv) return

  const saved = await Message.create({ senderId, recipientId, conversationId, ciphertext, iv })
  const event = {
    type: 'message',
    data: {
      id: String(saved._id),
      senderId,
      recipientId,
      conversationId,
      ciphertext,
      iv,
      createdAt: saved.createdAt
    }
  }

  const recipientSocket = getConnection(recipientId)
  if (recipientSocket && recipientSocket.readyState === recipientSocket.OPEN) {
    recipientSocket.send(JSON.stringify(event))
  } else {
    await queueMessage(recipientId, event.data)
  }

  await publish(event)
}
