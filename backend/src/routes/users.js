import { Router } from 'express'
import { me, setPublicKey, getPublicKey, searchUsers } from '../controllers/userController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.get('/me', authenticate, me)
router.get('/search', authenticate, searchUsers)
router.post('/public-key', authenticate, setPublicKey)
router.get('/:userId/public-key', authenticate, getPublicKey)

export default router
