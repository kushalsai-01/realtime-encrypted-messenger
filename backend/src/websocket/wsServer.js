import { WebSocketServer } from 'ws'
import { addConnection, removeConnection, getConnection, getOnlineUsers } from './connectionManager.js'
import { subscribe } from './redisPubSub.js'
import { routeMessage } from './messageHandler.js'
import { drainMessages } from '../services/offlineQueueService.js'
import { setOnline, setOffline, getPresence } from '../services/presenceService.js'
import { authenticateWs } from '../middleware/authenticate.js'
import { config } from '../config/env.js'

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  subscribe((event) => {
    const targetId = event?.data?.recipientId || event?.targetUserId
    if (!targetId) return
    const ws = getConnection(targetId)
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(event))
  })

  wss.on('connection', async (ws, req) => {
    const params = new URL(req.url, 'http://localhost').searchParams
    const token = params.get('token')
    const userIdParam = params.get('userId')

    let userId
    if (token) {
      const payload = await authenticateWs(token)
      if (!payload) {
        ws.close(1008, 'Unauthorized')
        return
      }
      userId = payload.sub
    } else if (userIdParam && config.NODE_ENV === 'development') {
      userId = userIdParam
    } else {
      ws.close(1008, 'Unauthorized')
      return
    }

    ws.userId = userId
    addConnection(userId, ws)
    await setOnline(userId, config.SERVER_ID)

    const pending = await drainMessages(userId)
    for (const msg of pending) {
      if (ws.readyState === ws.OPEN)
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

    broadcastPresence(wss, userId, 'online')
  })
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload))
}

function broadcastPresence(wss, userId, status) {
  const msg = JSON.stringify({ type: 'user:presence', data: { userId, status } })
  wss.clients.forEach((client) => {
    if (client !== wss.clients[userId] && client.readyState === client.OPEN)
      client.send(msg)
  })
}
