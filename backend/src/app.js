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

const dependencyHealth = {
  mongodb: false,
  postgres: false,
  redis: false
}

async function bootstrapConnections() {
  const results = await Promise.allSettled([
    connectMongoDB(),
    testDatabaseConnection(),
    testRedisConnection()
  ])
  dependencyHealth.mongodb = results[0].status === 'fulfilled'
  dependencyHealth.postgres = results[1].status === 'fulfilled'
  dependencyHealth.redis = results[2].status === 'fulfilled'
  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.error('[Startup] Connection error:', r.reason?.message || r.reason))
}

// CRIT-1: createServer is now async — bootstrapConnections is AWAITED before returning.
// This ensures the server is ready before index.js calls server.listen().
export async function createServer() {
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

  app.get('/health', (_, res) => {
    const healthy = dependencyHealth.mongodb && dependencyHealth.postgres && dependencyHealth.redis
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      dependencies: dependencyHealth,
      uptime: process.uptime(),
      timestamp: Date.now()
    })
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/messages', messageRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/rooms', roomRoutes)
  app.use(errorHandler)

  const server = http.createServer(app)
  attachWebSocket(server)

  // CRIT-1: Await ALL connections before returning. Server won't start listening until ready.
  await bootstrapConnections()

  return { app, server }
}
