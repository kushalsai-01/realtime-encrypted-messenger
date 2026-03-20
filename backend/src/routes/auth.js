import { Router } from 'express'
import {
  login,
  register,
  refresh,
  logout,
  getMe,
  getSessions,
  revokeSession,
  revokeAllSessions
} from '../controllers/authController.js'
import { authenticate } from '../middleware/authenticate.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh', refresh)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getMe)
router.get('/sessions', authenticate, getSessions)
router.delete('/sessions', authenticate, revokeAllSessions)
router.delete('/sessions/:sessionId', authenticate, revokeSession)

export default router
