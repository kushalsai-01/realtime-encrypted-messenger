import { WS_URL } from './api.js'
import { getAccessToken } from '../hooks/useAuth.js'

export class SocketManager {
  constructor({ userId, onMessage, onPresence, onTyping, onReadReceipt, onConnect, onDisconnect }) {
    this.userId = userId
    this.onMessage = onMessage
    this.onPresence = onPresence
    this.onTyping = onTyping
    this.onReadReceipt = onReadReceipt
    this.onConnect = onConnect
    this.onDisconnect = onDisconnect
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.baseDelay = 1000
    this.shouldReconnect = true
    this.heartbeatInterval = null
  }

  connect() {
    const token = getAccessToken()
    const base = WS_URL.replace(/\/$/, '')
    const url = token
      ? `${base}/ws?token=${encodeURIComponent(token)}`
      : `${base}/ws?userId=${encodeURIComponent(this.userId)}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.onConnect?.()
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      this.onDisconnect?.()
      if (this.shouldReconnect) this.scheduleReconnect()
    }

    this.ws.onerror = () => {}

    this.ws.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data)
        this.dispatch(packet)
      } catch {}
    }
  }

  dispatch(packet) {
    switch (packet.type) {
      case 'message':
        this.onMessage?.(packet.data)
        break
      case 'message:sent':
        this.onMessage?.({ ...packet.data, ack: true })
        break
      case 'user:presence':
        this.onPresence?.(packet.data)
        break
      case 'typing:start':
        this.onTyping?.({ ...packet.data, isTyping: true })
        break
      case 'typing:stop':
        this.onTyping?.({ ...packet.data, isTyping: false })
        break
      case 'messages:read':
        this.onReadReceipt?.(packet.data)
        break
      case 'message:reaction':
        this.onMessage?.({ ...packet.data, type: 'reaction_update' })
        break
      case 'message:deleted':
        this.onMessage?.({ ...packet.data, type: 'delete_update' })
        break
      case 'heartbeat:ack':
      case 'connected':
        break
      default:
        break
    }
  }

  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send('heartbeat', {})
    }, 60000)
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatInterval)
    this.heartbeatInterval = null
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onDisconnect?.({ permanent: true })
      return
    }
    const delay = Math.min(this.baseDelay * 2 ** this.reconnectAttempts, 30000)
    this.reconnectAttempts++
    setTimeout(() => this.connect(), delay)
  }

  disconnect() {
    this.shouldReconnect = false
    this.stopHeartbeat()
    this.ws?.close()
  }
}
