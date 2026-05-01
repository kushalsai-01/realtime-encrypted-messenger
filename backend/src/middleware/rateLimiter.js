import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { redis } from '../config/redis.js'

// IMP-8: Use Redis-backed store so rate limits are shared across all pods.
// Without this, each pod had its own in-memory counter — with 2 replicas
// an attacker could make 120*2=240 requests/min by round-robin across pods.
//
// @upstash/redis is compatible with rate-limit-redis via the sendCommand interface.
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/health',
  store: new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
    prefix: 'rl:'
  })
})

// Stricter limiter for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
  store: new RedisStore({
    sendCommand: (...args) => redis.sendCommand(args),
    prefix: 'rl:auth:'
  })
})
