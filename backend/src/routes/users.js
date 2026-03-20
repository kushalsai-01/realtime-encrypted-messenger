import { Router } from 'express'
import { me } from '../controllers/userController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.get('/me', authenticate, me)

export default router
