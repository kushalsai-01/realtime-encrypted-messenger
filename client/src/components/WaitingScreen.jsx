import { useEffect, useRef, useState } from 'react'
import { ChatSocket } from '../socket'

export default function WaitingScreen({ roomCode, userId, onPeerJoined, onLeave }) {
  const socketRef = useRef(null)
  const [copied, setCopied] = useState(false)

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

  async function copyCode() {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
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
          <div className="waiting-top">
            <div className="h2">waiting for peer…</div>
            <div className="pulse-dot" aria-hidden="true" />
          </div>

          <div className="code-label">share this code</div>
          <div className="code-block">{roomCode.slice(0, 6)}</div>
          <div className="tiny">{copied ? 'copied!' : 'full code copied to clipboard'}</div>

          <div className="spacer-14" />

          <button
            onClick={copyCode}
            className="btn-secondary btn-secondary-full"
            aria-label="Copy room code"
          >
            copy full code
          </button>

          <button onClick={onLeave} className="btn-text" aria-label="Cancel waiting">
            cancel
          </button>
        </div>
      </div>
    </div>
  )
}
