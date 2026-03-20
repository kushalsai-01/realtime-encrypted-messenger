import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import http from 'http'
import { config } from './config/env.js'
import { connectMongoDB } from './config/mongodb.js'
import { testDatabaseConnection } from './config/database.js'
import { testRedisConnection } from './config/redis.js'
import { apiRateLimiter } from './middleware/rateLimiter.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import messageRoutes from './routes/messages.js'
import userRoutes from './routes/users.js'
import roomRoutes from './routes/rooms.js'
import { attachWebSocket } from './websocket/wsServer.js'

async function bootstrapConnections() {
  try {
    await Promise.all([connectMongoDB(), testDatabaseConnection(), testRedisConnection()])
  } catch (err) {
    console.error('[Startup] Connection error', err.message)
  }
}

export function createServer() {
  const app = express()
  app.use(helmet())
  app.set('trust proxy', 1)
  app.use(
    cors({
      origin: config.CORS_ORIGIN.split(',').map((v) => v.trim()),
      credentials: true
    })
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(apiRateLimiter)

  app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: Date.now() }))
  app.use('/api/auth', authRoutes)
  app.use('/api/messages', messageRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/rooms', roomRoutes)
  app.use(errorHandler)

  const server = http.createServer(app)
  attachWebSocket(server)

  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    setInterval(async () => {
      try {
        await fetch(`${process.env.RENDER_EXTERNAL_URL}/health`)
        console.log('[KeepAlive] ✓')
      } catch (e) {
        console.warn('[KeepAlive] Failed:', e.message)
      }
    }, 14 * 60 * 1000)
  }

  void bootstrapConnections()
  return { app, server }
}
