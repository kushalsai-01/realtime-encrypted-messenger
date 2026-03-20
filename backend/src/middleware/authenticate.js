import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'
import { redis } from '../config/redis.js'

export async function authenticate(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
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
