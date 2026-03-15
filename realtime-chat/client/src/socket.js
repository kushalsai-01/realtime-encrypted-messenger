export class ChatSocket {
  constructor({ roomCode, userId, onMessage, onPresence, onError, onConnect }) {
    this.roomCode = roomCode
    this.userId = userId
    this.onMessage = onMessage
    this.onPresence = onPresence
    this.onError = onError
    this.onConnect = onConnect
    this.reconnectDelay = 1000
    this.maxReconnectDelay = 30000
    this.shouldReconnect = true
    this.ws = null
    this.connect()
  }

  connect() {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001'
    const url = `${wsUrl}/ws?userId=${this.userId}&room=${this.roomCode || ''}`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      this.reconnectDelay = 1000
      this.onConnect?.()
    }

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.route(message)
    }

    this.ws.onclose = (event) => {
      if (this.shouldReconnect && event.code !== 1000) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      this.onError?.('Connection error')
    }
  }

  route(message) {
    switch (message.type) {
      case 'MESSAGE':
        return this.onMessage?.(message)
      case 'PEER_JOINED':
        return this.onPresence?.('joined', message.payload)
      case 'PEER_LEFT':
        return this.onPresence?.('left', message.payload)
      case 'TYPING':
        return this.onPresence?.('typing', message.payload)
      case 'ROOM_CREATED':
        return this.onPresence?.('created', message.payload)
      case 'JOINED_ROOM':
        return this.onPresence?.('joined_room', message.payload)
      case 'ERROR':
        return this.onError?.(message.payload)
      default:
        console.log('Unknown message type:', message.type)
    }
  }

  scheduleReconnect() {
    const jitter = Math.random() * 1000
    const delay = Math.min(this.reconnectDelay + jitter, this.maxReconnectDelay)
    setTimeout(() => this.connect(), delay)
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay)
  }

  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  close() {
    this.shouldReconnect = false
    this.ws?.close(1000, 'User left')
  }
}
