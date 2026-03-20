import { Router } from 'express'
import {
  getMessages,
  sendMessage,
  deleteMessage,
  reactToMessage
} from '../controllers/messageController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router({ mergeParams: true })

router.get('/:conversationId', authenticate, getMessages)
router.post('/:conversationId', authenticate, sendMessage)
router.delete('/:messageId', authenticate, deleteMessage)
router.post('/:messageId/reactions', authenticate, reactToMessage)

export default router
