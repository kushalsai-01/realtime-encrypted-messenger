import { useState } from 'react'
import { ChatSocket } from '../socket'

export default function HomeScreen({ userId, onRoomCreated, onRoomJoined }) {
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function createRoom() {
    setLoading(true)
    const socket = new ChatSocket({
      userId,
      roomCode: null,
      onPresence: (event, payload) => {
        if (event === 'created') {
          socket.close()
          onRoomCreated(payload.code)
        }
      },
      onError: (err) => {
        setError(err)
        setLoading(false)
      },
      onConnect: () => socket.send('CREATE_ROOM', {})
    })
  }

  function joinRoom() {
    if (joinCode.length !== 6) return setError('Code must be 6 digits')
    setLoading(true)
    const socket = new ChatSocket({
      userId,
      roomCode: joinCode,
      onPresence: (event) => {
        if (event === 'joined_room') {
          socket.close()
          onRoomJoined(joinCode)
        }
      },
      onError: (err) => {
        setError(err)
        setLoading(false)
      },
      onConnect: () => socket.send('JOIN_ROOM', { code: joinCode })
    })
  }

  return (
    <div
      style={{
        maxWidth: 360,
        margin: '80px auto',
        padding: '32px 24px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        background: '#050509',
        color: '#f9f9ff',
        borderRadius: 12,
        boxShadow: '0 18px 45px rgba(0,0,0,0.8)',
        border: '1px solid #11111a'
      }}
    >
      <h2 style={{ marginBottom: 4, fontSize: 20, fontWeight: 600 }}>encrypted chat</h2>
      <p style={{ fontSize: 12, color: '#8f90ff', marginBottom: 24 }}>
        end-to-end encrypted · rooms self-destruct when empty
      </p>

      <button
        onClick={createRoom}
        disabled={loading}
        style={{
          width: '100%',
          padding: '12px',
          marginBottom: 16,
          cursor: loading ? 'default' : 'pointer',
          fontSize: 14,
          fontWeight: 500,
          borderRadius: 999,
          border: 'none',
          background: loading ? '#20202a' : '#f5f5ff',
          color: loading ? '#7c7cff' : '#050509',
          transition: 'background 0.15s ease, transform 0.1s ease',
          transform: loading ? 'scale(1)' : 'scale(1)'
        }}
      >
        {loading ? 'creating…' : 'create room'}
      </button>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="enter 6-digit code"
          maxLength={6}
          style={{
            flex: 1,
            padding: '12px',
            fontSize: 14,
            letterSpacing: 4,
            borderRadius: 999,
            border: '1px solid #1b1b25',
            outline: 'none',
            background: '#030307',
            color: '#f9f9ff'
          }}
        />
        <button
          onClick={joinRoom}
          disabled={loading || joinCode.length !== 6}
          style={{
            padding: '12px 18px',
            cursor: loading || joinCode.length !== 6 ? 'default' : 'pointer',
            fontSize: 13,
            borderRadius: 999,
            border: 'none',
            background: loading || joinCode.length !== 6 ? '#15151d' : '#2a2a3c',
            color: '#f9f9ff'
          }}
        >
          join
        </button>
      </div>

  {error && <p style={{ color: '#ff6b81', fontSize: 12, marginTop: 4 }}>{error}</p>}
    </div>
  )
}
