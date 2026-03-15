import 'dotenv/config'
import http from 'http'
import { WebSocketServer } from 'ws'
import { parse } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { handleConnection, startHeartbeat } from './message-handler.js'

const PORT = process.env.PORT || 3001

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }))
    return
  }
  res.writeHead(404)
  res.end()
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const { pathname, query } = parse(request.url, true)

  if (pathname !== '/ws') {
    socket.destroy()
    return
  }

  const userId = query.userId || uuidv4()
  const roomCode = query.room || null

  const origin = request.headers.origin
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173']
  if (process.env.NODE_ENV === 'production' && !allowedOrigins.includes(origin)) {
    socket.destroy()
    return
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.userId = userId
    ws.roomCode = roomCode
    handleConnection(ws, userId, roomCode)
  })
})

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})

startHeartbeat(wss)

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server')
  wss.clients.forEach((ws) => ws.close(1001, 'Server shutting down'))
  server.close(() => process.exit(0))
})
