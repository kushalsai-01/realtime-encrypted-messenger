import { Schema, model } from 'mongoose'

const reactionSchema = new Schema(
  {
    userId: { type: String, required: true },
    emoji: { type: String, required: true }
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
)

const readBySchema = new Schema(
  {
    userId: { type: String, required: true },
    readAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    recipientId: { type: String, required: true, index: true },
    ciphertext: { type: String, required: true },
    iv: { type: String, required: true },
    replyToId: { type: String, default: null },
    deleted: { type: Boolean, default: false },
    reactions: { type: [reactionSchema], default: [] },
    readBy: { type: [readBySchema], default: [] }
  },
  { timestamps: true }
)

// IMP-G6: Compound index for efficient paginated message queries.
// The primary query pattern is: find by conversationId, sorted by createdAt DESC.
// Without this compound index, MongoDB does a full collection scan at scale.
messageSchema.index({ conversationId: 1, createdAt: -1 })

export const Message = model('Message', messageSchema)
