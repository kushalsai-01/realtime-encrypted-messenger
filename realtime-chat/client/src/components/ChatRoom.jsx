import { useState, useEffect, useRef } from 'react'
import { ChatSocket } from '../socket'
import { deriveRoomKey, encryptMessage, decryptMessage } from '../crypto'

export default function ChatRoom({ roomCode, userId, onLeave }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const [connected, setConnected] = useState(false)
  const [peerOnline, setPeerOnline] = useState(true)
  const socketRef = useRef(null)
  const keyRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    async function init() {
      keyRef.current = await deriveRoomKey(roomCode)

      socketRef.current = new ChatSocket({
        userId,
        roomCode,
        onConnect: () => setConnected(true),
        onMessage: async (msg) => {
          const plaintext = await decryptMessage(keyRef.current, msg.payload.iv, msg.payload.ciphertext)
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              from: msg.from,
              text: plaintext,
              timestamp: msg.timestamp,
              mine: false
            }
          ])
        },
        onPresence: (event) => {
          if (event === 'left') setPeerOnline(false)
          if (event === 'joined') setPeerOnline(true)
          if (event === 'typing') {
            setPeerTyping(true)
            clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 2000)
          }
        },
        onError: (err) => console.error(err)
      })
    }
    init()
    return () => socketRef.current?.close()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, peerTyping])

  async function sendMessage() {
    if (!input.trim() || !keyRef.current) return
    const text = input.trim()
    setInput('')

    const encrypted = await encryptMessage(keyRef.current, text)
    socketRef.current.send('MESSAGE', encrypted)

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        from: userId,
        text,
        timestamp: Date.now(),
        mine: true
      }
    ])
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    } else {
      socketRef.current?.send('TYPING', { isTyping: true })
    }
  }

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '0 auto',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        background: '#050509',
        color: '#f9f9ff'
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #15151f',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#050509'
        }}
      >
        <div>
          <span style={{ fontSize: 12, color: '#8f90ff' }}>room {roomCode}</span>
          <span style={{ fontSize: 11, marginLeft: 8, color: connected ? '#5dffb4' : '#ff9b73' }}>
            {connected ? 'encrypted' : 'connecting…'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: peerOnline ? '#5dffb4' : '#55556a' }}>
            {peerOnline ? 'peer online' : 'peer offline'}
          </span>
          <button
            onClick={onLeave}
            style={{
              fontSize: 11,
              padding: '5px 10px',
              cursor: 'pointer',
              borderRadius: 999,
              border: '1px solid #1f1f2a',
              background: '#050509',
              color: '#f9f9ff'
            }}
          >
            leave
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#050509' }}>
        {messages.length === 0 && (
          <p style={{ color: '#686884', fontSize: 12, textAlign: 'center', marginTop: 40 }}>
            messages are end-to-end encrypted. the server cannot read them.
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.mine ? 'flex-end' : 'flex-start',
              marginBottom: 8
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '8px 12px',
                background: msg.mine ? '#f9f9ff' : '#151522',
                color: msg.mine ? '#050509' : '#f9f9ff',
                borderRadius: 10,
                fontSize: 13,
                lineHeight: 1.4,
                boxShadow: msg.mine ? '0 8px 20px rgba(0,0,0,0.5)' : 'none'
              }}
            >
              {msg.text}
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.5,
                  marginTop: 4,
                  textAlign: 'right'
                }}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {peerTyping && <div style={{ color: '#8f90ff', fontSize: 12, marginBottom: 8 }}>peer is typing…</div>}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: 12,
          borderTop: '1px solid #15151f',
          display: 'flex',
          gap: 8,
          background: '#050509'
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type a message…"
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: 13,
            borderRadius: 999,
            border: '1px solid #1b1b26',
            background: '#030307',
            color: '#f9f9ff',
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: 13,
            borderRadius: 999,
            border: 'none',
            background: '#f9f9ff',
            color: '#050509'
          }}
        >
          send
        </button>
      </div>
    </div>
  )
}
