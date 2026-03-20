import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

export function authenticate(req, res, next) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = jwt.verify(token, config.JWT_SECRET)
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
