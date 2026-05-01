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
import { authRateLimiter } from '../middleware/rateLimiter.js'

const router = Router()

// Apply stricter rate limiter to auth mutation endpoints
router.post('/register', authRateLimiter, register)
router.post('/login', authRateLimiter, login)
router.post('/refresh', authRateLimiter, refresh)
router.post('/logout', authenticate, logout)
router.get('/me', authenticate, getMe)
router.get('/sessions', authenticate, getSessions)
router.delete('/sessions', authenticate, revokeAllSessions)
router.delete('/sessions/:sessionId', authenticate, revokeSession)

export default router
