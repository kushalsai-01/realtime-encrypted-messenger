import 'dotenv/config'
import http from 'http'
import { WebSocketServer } from 'ws'
import { parse } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { handleConnection, startHeartbeat } from './message-handler.js'
import redisClient, { connectPromise } from './redis-client.js'
import { RateLimiter } from './rate-limiter.js'

const PORT = process.env.PORT || 3001
const rateLimiter = new RateLimiter()

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    const origin = req.headers.origin
    const isLocalhost =
      origin?.startsWith('http://localhost') || origin?.startsWith('http://127.0.0.1')
    const rawAllowed = process.env.ALLOWED_ORIGINS || ''
    const allowedOrigins = rawAllowed
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
    const allowOrigin = isLocalhost || allowedOrigins.includes(origin) ? origin : null

    const corsHeaders = {
      ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
      ...(allowOrigin ? { Vary: 'Origin' } : {}),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders)
      res.end()
      return
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Cache-Control': 'no-store',
      ...corsHeaders
    })
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ noServer: true })

await connectPromise

const rawAllowed = process.env.ALLOWED_ORIGINS || ''
const allowedOrigins = rawAllowed
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

server.on('upgrade', (request, socket, head) => {
  const { pathname, query } = parse(request.url, true)

  if (pathname !== '/ws') {
    socket.destroy()
    return
  }

  const userId = query.userId || uuidv4()
  const roomCode = query.room || null

  const origin = request.headers.origin
  const isLocalhost =
    origin?.startsWith('http://localhost') || origin?.startsWith('http://127.0.0.1')
  const env = process.env.NODE_ENV || 'development'

  if (!isLocalhost) {
    const allowed = allowedOrigins.includes(origin)
    if (!allowed && env !== 'development') {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
      socket.destroy()
      return
    }
  }

  const ip = request.socket.remoteAddress || request.headers['x-forwarded-for'] || 'unknown'

  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.userId = userId
    ws.roomCode = roomCode
    ws.connectionId = ip
    ws.rateLimiter = rateLimiter
    handleConnection(ws, userId, roomCode)
  })
})

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})

const stopHeartbeat = startHeartbeat(wss)

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server')
  stopHeartbeat()
  rateLimiter.stop()
  wss.clients.forEach((ws) => ws.close(1001, 'Server shutting down'))
  server.close(() => process.exit(0))
})
