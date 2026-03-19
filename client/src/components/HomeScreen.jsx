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
    if (joinCode.length !== 20) return setError('Code must be 20 characters')
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
    <div className="centered">
      <div>
        <div className="logo">
          <div className="logo-title">encrypted chat</div>
          <div className="logo-subtitle">
            <span aria-hidden="true">🔒</span>
            <span>end-to-end encrypted · zero knowledge</span>
          </div>
        </div>

        <div className="card">
          <button onClick={createRoom} disabled={loading} className="btn-primary">
            {loading ? 'creating…' : 'create room'}
          </button>

          <div className="divider" aria-hidden="true">
            <div className="divider-line" />
            <div className="divider-text">or</div>
            <div className="divider-line" />
          </div>

          <div className="field">
            <label htmlFor="room-code" className="label">
              room code
            </label>
            <div className="row">
              <input
                id="room-code"
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-7]/g, '').slice(0, 20))
                }
                placeholder="enter 20-char code"
                maxLength={20}
                className="input"
              />
              <button onClick={joinRoom} disabled={loading || joinCode.length !== 20} className="btn-secondary">
                join
              </button>
            </div>
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      </div>
    </div>
  )
}
