import { Router } from 'express'
import {
  createRoom,
  createDM,
  listRooms,
  getRoom,
  getMembers,
  addMember,
  removeMember
} from '../controllers/roomController.js'
import {
  getMessages,
  sendMessage,
  deleteMessage,
  reactToMessage
} from '../controllers/messageController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

// CRIT-6: Static-prefix routes MUST be registered before the wildcard /:roomId route.
// Previously /:roomId was registered first, causing Express to match
// DELETE /api/rooms/messages/abc as /:roomId with roomId="messages" instead of
// hitting the /messages/:messageId handler.

// Static routes first
router.get('/', authenticate, listRooms)
router.post('/', authenticate, createRoom)
router.post('/dm', authenticate, createDM)

// Message routes (static prefix /messages) — BEFORE wildcard /:roomId
router.get('/:conversationId/messages', authenticate, getMessages)
router.post('/:conversationId/messages', authenticate, sendMessage)
router.delete('/messages/:messageId', authenticate, deleteMessage)
router.post('/messages/:messageId/reactions', authenticate, reactToMessage)

// Wildcard room routes — AFTER all static prefixes
router.get('/:roomId', authenticate, getRoom)
router.get('/:roomId/members', authenticate, getMembers)
router.post('/:roomId/members', authenticate, addMember)
router.delete('/:roomId/members/:userId', authenticate, removeMember)

export default router
