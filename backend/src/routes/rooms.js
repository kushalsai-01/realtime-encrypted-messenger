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

router.get('/', authenticate, listRooms)
router.post('/', authenticate, createRoom)
router.post('/dm', authenticate, createDM)
router.get('/:roomId', authenticate, getRoom)
router.get('/:roomId/members', authenticate, getMembers)
router.post('/:roomId/members', authenticate, addMember)
router.delete('/:roomId/members/:userId', authenticate, removeMember)

router.get('/:conversationId/messages', authenticate, getMessages)
router.post('/:conversationId/messages', authenticate, sendMessage)
router.delete('/messages/:messageId', authenticate, deleteMessage)
router.post('/messages/:messageId/reactions', authenticate, reactToMessage)

export default router
