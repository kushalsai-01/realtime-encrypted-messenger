import { useEffect, useRef, useState } from 'react'
import { connect } from '../services/wsClient.js'

export function useWebSocket({ userId, decrypt }) {
  const [status, setStatus] = useState('connecting')
  const wsRef = useRef(null)

  useEffect(() => {
    const ws = connect({ userId })
    wsRef.current = ws
    ws.onopen = () => setStatus('connected')
    ws.onclose = () => setStatus('disconnected')
    ws.onerror = () => setStatus('error')
    ws.onmessage = async (event) => {
      try {
        const packet = JSON.parse(event.data)
        if (packet?.data?.ciphertext && packet?.data?.iv) {
          await decrypt(packet.data.ciphertext, packet.data.iv)
        }
      } catch {
        setStatus('error')
      }
    }
    return () => ws.close()
  }, [userId, decrypt])

  function send(data) {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data))
  }

  return { status, send }
}
