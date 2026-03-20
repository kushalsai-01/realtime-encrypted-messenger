import { Schema, model } from 'mongoose'

const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true }
  },
  { timestamps: true }
)

export const Message = model('Message', messageSchema)
