import { useEffect, useRef } from 'react'
import { ChatSocket } from '../socket'

export default function WaitingScreen({ roomCode, userId, onPeerJoined, onLeave }) {
  const socketRef = useRef(null)

  useEffect(() => {
    socketRef.current = new ChatSocket({
      userId,
      roomCode,
      onPresence: (event) => {
        if (event === 'joined') onPeerJoined()
      },
      onConnect: () => {}
    })
    return () => socketRef.current?.close()
  }, [])

  function copyCode() {
    navigator.clipboard.writeText(roomCode)
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '80px auto',
        padding: '32px 28px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        background: '#050509',
        color: '#f9f9ff',
        borderRadius: 12,
        boxShadow: '0 18px 45px rgba(0,0,0,0.8)',
        border: '1px solid #11111a',
        textAlign: 'center'
      }}
    >
      <p style={{ fontSize: 13, color: '#8f90ff', marginBottom: 18 }}>share this code with your friend</p>
      <div
        style={{
          fontSize: 40,
          letterSpacing: 10,
          fontWeight: 600,
          marginBottom: 16,
          padding: '16px 12px',
          borderRadius: 10,
          background: '#0a0a12',
          border: '1px solid #181824'
        }}
      >
        {roomCode}
      </div>
      <button
        onClick={copyCode}
        style={{
          marginBottom: 12,
          padding: '10px 18px',
          cursor: 'pointer',
          fontSize: 13,
          borderRadius: 999,
          border: 'none',
          background: '#f5f5ff',
          color: '#050509'
        }}
      >
        copy code
      </button>
      <div style={{ marginTop: 20, fontSize: 12, color: '#7c7cff' }}>waiting for someone to join…</div>
      <button
        onClick={onLeave}
        style={{
          padding: '8px 16px',
          cursor: 'pointer',
          fontSize: 12,
          marginTop: 24,
          borderRadius: 999,
          border: '1px solid #262636',
          background: '#050509',
          color: '#f9f9ff'
        }}
      >
        cancel
      </button>
    </div>
  )
}
