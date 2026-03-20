import { Router } from 'express'
import { getMessages } from '../controllers/messageController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.get('/:conversationId', authenticate, getMessages)

export default router
