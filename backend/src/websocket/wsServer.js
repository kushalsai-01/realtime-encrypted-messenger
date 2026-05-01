import { WebSocketServer } from 'ws'
import { addConnection, removeConnection, getConnection } from './connectionManager.js'
import { subscribe } from './redisPubSub.js'
import { routeMessage } from './messageHandler.js'
import { drainMessages } from '../services/offlineQueueService.js'
import { setOnline, setOffline } from '../services/presenceService.js'
import { authenticateWs } from '../middleware/authenticate.js'
import { config } from '../config/env.js'

// IMP-4: Server-side ping interval — keeps connections alive through load balancers
// and detects dead clients without waiting for client heartbeats (60s client interval)
const PING_INTERVAL_MS = 30_000

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  // Cross-pod message delivery via Redis pub/sub
  subscribe((event) => {
    const targetId = event?.data?.recipientId || event?.targetUserId
    if (!targetId) return
    const ws = getConnection(targetId)
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(event))
  })

  // IMP-4: Server-side keepalive — ping all clients every 30s, terminate dead ones
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        removeConnection(ws.userId)
        return ws.terminate()
      }
      ws.isAlive = false
      ws.ping()
    })
  }, PING_INTERVAL_MS)

  wss.on('close', () => clearInterval(pingInterval))

  wss.on('connection', async (ws, req) => {
    // CRIT-2: Removed userId query-param auth bypass — JWT is the ONLY auth mechanism.
    // The dev fallback (?userId=xxx) allowed anyone to impersonate any user.
    const params = new URL(req.url, 'http://localhost').searchParams
    const token = params.get('token')

    const payload = await authenticateWs(token)
    if (!payload) {
      ws.close(1008, 'Unauthorized')
      return
    }

    const userId = payload.sub
    ws.userId = userId
    ws.isAlive = true

    // IMP-4: Mark alive on pong response
    ws.on('pong', () => { ws.isAlive = true })

    addConnection(userId, ws)
    await setOnline(userId, config.SERVER_ID)

    // Drain queued offline messages
    const pending = await drainMessages(userId)
    for (const msg of pending) {
      if (ws.readyState === 1)
        ws.send(JSON.stringify({ type: 'message', data: msg }))
    }

    send(ws, { type: 'connected', data: { userId } })

    ws.on('message', async (raw) => {
      try {
        const packet = JSON.parse(String(raw))
        await routeMessage(ws, userId, packet, wss)
      } catch (err) {
        send(ws, { type: 'error', message: err.message })
      }
    })

    ws.on('close', async () => {
      removeConnection(userId)
      await setOffline(userId)
      broadcastPresence(wss, userId, 'offline')
    })

    ws.on('error', (err) => {
      console.warn('[WS] Client error for user', userId, err.message)
    })

    broadcastPresence(wss, userId, 'online')
  })
}

function send(ws, payload) {
  if (ws?.readyState === 1) ws.send(JSON.stringify(payload))
}

function broadcastPresence(wss, userId, status) {
  const msg = JSON.stringify({ type: 'user:presence', data: { userId, status } })
  wss.clients.forEach((client) => {
    if (client.userId !== userId && client.readyState === 1)
      client.send(msg)
  })
}
