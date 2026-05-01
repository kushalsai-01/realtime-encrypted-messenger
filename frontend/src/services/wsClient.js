import { WS_URL } from './api.js'
import { getAccessToken } from '../hooks/useAuth.js'

export class SocketManager {
  constructor({ userId, onMessage, onPresence, onTyping, onReadReceipt, onConnect, onDisconnect }) {
    this.userId = userId
    // IMP-5: Store callbacks as refs (object properties updated in-place) to avoid
    // stale closure bug. The hook updates these properties when callbacks change.
    this._handlers = { onMessage, onPresence, onTyping, onReadReceipt, onConnect, onDisconnect }
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 10
    this.baseDelay = 1000
    this.shouldReconnect = true
    this.heartbeatInterval = null
  }

  // IMP-5: Allow the hook to update callbacks without recreating the manager
  updateHandlers(handlers) {
    Object.assign(this._handlers, handlers)
  }

  connect() {
    const token = getAccessToken()
    if (!token) {
      // No token — don't attempt connection, redirect to login
      this._handlers.onDisconnect?.({ permanent: true, reason: 'unauthenticated' })
      return
    }
    const base = WS_URL.replace(/\/$/, '')
    const url = `${base}/ws?token=${encodeURIComponent(token)}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this._handlers.onConnect?.()
    }

    this.ws.onclose = (event) => {
      this.stopHeartbeat()

      // IMP-3: Handle WS 1008 (Policy Violation = Unauthorized).
      // This happens when the JWT is rejected by the server (expired, revoked, invalid).
      // Do NOT reconnect — redirect to login instead.
      if (event.code === 1008) {
        this.shouldReconnect = false
        this._handlers.onDisconnect?.({ permanent: true, reason: 'unauthorized' })
        localStorage.removeItem('cl_access_token')
        localStorage.removeItem('cl_refresh_token')
        localStorage.removeItem('cl_user')
        window.location.href = '/login'
        return
      }

      this._handlers.onDisconnect?.()
      if (this.shouldReconnect) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      // onerror is always followed by onclose — let onclose handle reconnect logic
    }

    this.ws.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data)
        this.dispatch(packet)
      } catch {
        // Ignore malformed messages
      }
    }
  }

  dispatch(packet) {
    switch (packet.type) {
      case 'message':
        this._handlers.onMessage?.(packet.data)
        break
      case 'message:sent':
        this._handlers.onMessage?.({ ...packet.data, ack: true })
        break
      case 'user:presence':
        this._handlers.onPresence?.(packet.data)
        break
      case 'typing:start':
        this._handlers.onTyping?.({ ...packet.data, isTyping: true })
        break
      case 'typing:stop':
        this._handlers.onTyping?.({ ...packet.data, isTyping: false })
        break
      case 'messages:read':
        this._handlers.onReadReceipt?.(packet.data)
        break
      case 'message:reaction':
        this._handlers.onMessage?.({ ...packet.data, type: 'reaction_update' })
        break
      case 'message:deleted':
        this._handlers.onMessage?.({ ...packet.data, type: 'delete_update' })
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
    }, 30000) // Every 30s — aligned with server-side ping interval
  }

  stopHeartbeat() {
    clearInterval(this.heartbeatInterval)
    this.heartbeatInterval = null
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._handlers.onDisconnect?.({ permanent: true })
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
