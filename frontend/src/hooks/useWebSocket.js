import { useEffect, useRef, useState, useCallback } from 'react'
import { SocketManager } from '../services/wsClient.js'

// IMP-5: Callbacks (onMessage, onPresence, etc.) are stored as refs and synced
// to the SocketManager on every render. This prevents stale closures where the
// manager holds an outdated function reference after parent re-renders.
export function useWebSocket({ userId, onMessage, onPresence, onTyping, onReadReceipt }) {
  const [status, setStatus] = useState('connecting')
  const managerRef = useRef(null)

  // Keep live refs to all callbacks so we can sync them without recreating the manager
  const handlersRef = useRef({ onMessage, onPresence, onTyping, onReadReceipt })

  // Sync latest callbacks into the manager on every render (no deps = always fresh)
  useEffect(() => {
    handlersRef.current = { onMessage, onPresence, onTyping, onReadReceipt }
    managerRef.current?.updateHandlers(handlersRef.current)
  })

  useEffect(() => {
    if (!userId) return

    const manager = new SocketManager({
      userId,
      ...handlersRef.current,
      onConnect: () => setStatus('connected'),
      onDisconnect: (info) => setStatus(info?.permanent ? 'failed' : 'reconnecting')
    })
    managerRef.current = manager
    manager.connect()

    return () => manager.disconnect()
  }, [userId]) // Only recreate when userId changes

  const send = useCallback((type, payload) => {
    managerRef.current?.send(type, payload)
  }, [])

  return { status, send }
}
