import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { redis } from '../config/redis.js'

// IMP-1: Guard against absurdly large tokens before hitting jwt.verify()
const MAX_TOKEN_LENGTH = 2048

export async function authenticate(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  if (token.length > MAX_TOKEN_LENGTH) return res.status(401).json({ error: 'Invalid token' })
  try {
    const payload = jwt.verify(token, config.JWT_SECRET)
    if (payload.jti) {
      const blacklisted = await redis.get(`blacklist:${payload.jti}`)
      if (blacklisted) return res.status(401).json({ error: 'Token revoked' })
    }
    req.user = payload
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export async function authenticateWs(token) {
  if (!token) return null
  if (token.length > MAX_TOKEN_LENGTH) return null
  try {
    const payload = jwt.verify(token, config.JWT_SECRET)
    if (payload.jti) {
      const blacklisted = await redis.get(`blacklist:${payload.jti}`)
      if (blacklisted) return null
    }
    return payload
  } catch {
    return null
  }
}
