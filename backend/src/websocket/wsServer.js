import { WebSocketServer } from 'ws'
import { addConnection, removeConnection, getConnection } from './connectionManager.js'
import { subscribe } from './redisPubSub.js'
import { handleSocketMessage } from './messageHandler.js'
import { drainMessages } from '../services/offlineQueueService.js'
import { setOnline, setOffline } from '../services/presenceService.js'
import { config } from '../config/env.js'

export function attachWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  subscribe((event) => {
    if (!event?.data?.recipientId) return
    const ws = getConnection(event.data.recipientId)
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(event))
  })

  wss.on('connection', async (ws, req) => {
    const params = new URL(req.url, 'http://localhost').searchParams
    const userId = params.get('userId')
    if (!userId) {
      ws.close(1008, 'Missing userId')
      return
    }

    addConnection(userId, ws)
    await setOnline(userId, config.SERVER_ID)

    const pending = await drainMessages(userId)
    for (const msg of pending) {
      if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'message', data: msg }))
    }

    ws.on('message', async (raw) => {
      try {
        const packet = JSON.parse(String(raw))
        await handleSocketMessage(userId, packet)
      } catch (err) {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'error', message: err.message }))
      }
    })

    ws.on('close', async () => {
      removeConnection(userId)
      await setOffline(userId)
    })
  })
}
