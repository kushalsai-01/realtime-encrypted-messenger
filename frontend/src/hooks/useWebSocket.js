import { useEffect, useRef, useState, useCallback } from 'react'
import { SocketManager } from '../services/wsClient.js'

export function useWebSocket({ userId, onMessage, onPresence, onTyping, onReadReceipt }) {
  const [status, setStatus] = useState('connecting')
  const managerRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    const manager = new SocketManager({
      userId,
      onMessage,
      onPresence,
      onTyping,
      onReadReceipt,
      onConnect: () => setStatus('connected'),
      onDisconnect: (info) => setStatus(info?.permanent ? 'failed' : 'reconnecting')
    })
    managerRef.current = manager
    manager.connect()

    return () => manager.disconnect()
  }, [userId])

  const send = useCallback((type, payload) => {
    managerRef.current?.send(type, payload)
  }, [])

  return { status, send }
}
