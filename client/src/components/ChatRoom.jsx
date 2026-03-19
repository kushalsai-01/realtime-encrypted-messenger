import { useState, useEffect, useRef } from 'react'
import { ChatSocket } from '../socket'
import { deriveRoomKey, encryptMessage, decryptMessage } from '../crypto'
import { sendFile, receiveChunk } from '../fileTransfer'

export default function ChatRoom({ roomCode, userId, onLeave }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [peerTyping, setPeerTyping] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectionState, setConnectionState] = useState('reconnecting')
  const [peerOnline, setPeerOnline] = useState(true)
  const [fileError, setFileError] = useState('')
  const [fileProgress, setFileProgress] = useState(0)
  const [connectionLost, setConnectionLost] = useState(false)
  const socketRef = useRef(null)
  const keyRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const transfersRef = useRef(new Map())
  const objectUrlsRef = useRef([])
  const textareaRef = useRef(null)
  const messagesRef = useRef(null)
  const stickToBottomRef = useRef(true)

  useEffect(() => {
    async function init() {
      keyRef.current = await deriveRoomKey(roomCode)

      socketRef.current = new ChatSocket({
        userId,
        roomCode,
        onConnect: () => {
          setConnected(true)
          setConnectionState('connected')
        },
        onMessage: async (msg) => {
          if (msg.type === 'MESSAGE') {
            const plaintext = await decryptMessage(
              keyRef.current,
              msg.payload.iv,
              msg.payload.ciphertext
            )
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                from: msg.from,
                text: plaintext,
                timestamp: msg.timestamp,
                mine: false,
                kind: 'text'
              }
            ])
            return
          }
          if (msg.type === 'FILE_CHUNK') {
            const result = await receiveChunk(msg, transfersRef.current, keyRef.current)
            if (result.done && result.file) {
              const url = URL.createObjectURL(result.file)
              objectUrlsRef.current.push(url)
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now() + Math.random(),
                  from: msg.senderId,
                  timestamp: Date.now(),
                  mine: msg.senderId === userId,
                  kind: 'file',
                  fileUrl: url,
                  fileName: result.fileName,
                  fileType: result.fileType
                }
              ])
              setFileProgress(0)
            } else if (!result.done && typeof result.progress === 'number') {
              setFileProgress(result.progress)
            }
            return
          }
          if (msg.type === 'FILE_TRANSFER_ERROR') {
            setFileError('File transfer failed')
            setFileProgress(0)
            return
          }
        },
        onPresence: (event) => {
          if (event === 'left') setPeerOnline(false)
          if (event === 'joined') setPeerOnline(true)
          if (event === 'typing') {
            setPeerTyping(true)
            clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 3000)
          }
        },
        onError: (err) => {
          if (err === 'MAX_RECONNECT_EXCEEDED') {
            setConnectionLost(true)
            setConnectionState('disconnected')
            return
          }
          if (err === 'RECONNECTING') {
            setConnectionState('reconnecting')
            return
          }
          setConnectionState('disconnected')
        }
      })
    }
    init()
    return () => {
      socketRef.current?.close()
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      objectUrlsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (stickToBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, peerTyping, fileProgress])

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
        mine: true,
        kind: 'text'
      }
    ])
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && e.ctrlKey)) {
      e.preventDefault()
      sendMessage()
    } else {
      socketRef.current?.send('TYPING', { isTyping: true })
    }
  }

  function autoGrow() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function handleFileClick() {
    setFileError('')
    fileInputRef.current?.click()
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      setFileError('File too large (max 50MB)')
      return
    }
    if (!keyRef.current || !socketRef.current) return
    setFileProgress(0)
    const sender = sendFile(file, roomCode, keyRef.current, (chunk) => {
      if (chunk.type === 'FILE_CHUNK' || chunk.type === 'FILE_TRANSFER_COMPLETE') {
        const { type, ...payload } = chunk
        socketRef.current.send(type, payload)
      }
    })
    sender.onProgress((p) => setFileProgress(p))
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  function formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB']
    let v = bytes
    let i = 0
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024
      i++
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
  }

  function statusDotClass() {
    if (connectionState === 'connected') return 'success'
    if (connectionState === 'reconnecting') return 'warning'
    return 'danger'
  }

  function statusText() {
    if (connectionState === 'connected') return 'encrypted'
    if (connectionState === 'reconnecting') return 'reconnecting...'
    return 'disconnected'
  }

  function PaperclipIcon({ size = 18 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  function SendIcon({ size = 18 }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 17L17 7M10 7h7v7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  function onScrollMessages() {
    const el = messagesRef.current
    if (!el) return
    const threshold = 32
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }

  return (
    <div className="chat">
      {connectionLost && (
        <div className="overlay" role="dialog" aria-modal="true">
          <div className="overlay-card">
            <div className="overlay-title">Connection lost — please refresh the page</div>
            <div className="overlay-sub">We couldn’t reconnect after multiple attempts.</div>
            <div className="spacer-14" />
            <button className="btn-primary" onClick={() => window.location.reload()}>
              refresh
            </button>
          </div>
        </div>
      )}

      <div className="topbar">
        <div className="topbar-left">encrypted chat</div>
        <div className="status-badge" aria-live="polite">
          <span className={`status-dot ${statusDotClass()}`} aria-hidden="true" />
          <span style={{ color: connectionState === 'connected' ? 'var(--success)' : connectionState === 'reconnecting' ? 'var(--warning)' : 'var(--danger)' }}>
            {statusText()}
          </span>
        </div>
        <div className="peer">
          <span className={`peer-dot ${peerOnline ? 'online' : ''}`} aria-hidden="true" />
          <span>{peerOnline ? 'peer online' : 'peer offline'}</span>
          <button className="btn-text" onClick={onLeave} aria-label="Leave room">
            leave
          </button>
        </div>
      </div>

      <div className="messages scrollbar" ref={messagesRef} onScroll={onScrollMessages} role="log" aria-live="polite">
        <div className="messages-inner">
          {messages.map((msg) => {
            const time = formatTime(msg.timestamp)
            const title = new Date(msg.timestamp).toString()
            return (
              <div key={msg.id} className="msg-row">
                <div className={`bubble ${msg.mine ? 'bubble-mine' : 'bubble-theirs'}`}>
                  {msg.kind === 'file' ? (
                    <>
                      {msg.fileType && msg.fileType.startsWith('image/') && (
                        <img
                          src={msg.fileUrl}
                          alt={msg.fileName}
                          className="file-preview"
                          onClick={() => window.open(msg.fileUrl, '_blank')}
                        />
                      )}
                      {msg.fileType && msg.fileType.startsWith('video/') && (
                        <video controls src={msg.fileUrl} className="file-preview" />
                      )}
                      {!(msg.fileType && (msg.fileType.startsWith('image/') || msg.fileType.startsWith('video/'))) && (
                        <div className="file-card">
                          <div className="file-icn" aria-hidden="true">
                            📎
                          </div>
                          <div className="file-meta">
                            <div className="file-name">{msg.fileName}</div>
                            <div className="file-size">{formatSize(msg.fileSize || 0)}</div>
                          </div>
                          <button
                            className="download-btn"
                            onClick={() => {
                              const a = document.createElement('a')
                              a.href = msg.fileUrl
                              a.download = msg.fileName || 'download'
                              a.click()
                            }}
                          >
                            download
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    msg.text
                  )}
                  <div className={`timestamp ${msg.mine ? 'mine' : 'theirs'}`} title={title}>
                    {time}
                  </div>
                </div>
              </div>
            )
          })}

          {peerTyping && (
            <div className="msg-row">
              <div className="typing-indicator" aria-label="Peer is typing">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          {fileError && <div className="error">{fileError}</div>}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="bottombar">
        {fileProgress > 0 && fileProgress < 100 && (
          <div className="progress" aria-hidden="true">
            <div className="progress-bar" style={{ width: `${fileProgress}%` }} />
          </div>
        )}

        <div className="composer">
          <div className="composer-inner">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value)
                autoGrow()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                  return
                }
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault()
                  sendMessage()
                  return
                }
                socketRef.current?.send('TYPING', { isTyping: true })
              }}
              placeholder="Type a message…"
              className="textarea"
              aria-label="Type a message"
              role="textbox"
            />

            <button
              type="button"
              onClick={handleFileClick}
              className="icon-btn"
              aria-label="Attach file (images, video, PDF up to 50MB)"
            >
              <PaperclipIcon />
            </button>

            <button
              type="button"
              onClick={sendMessage}
              className="send-btn"
              aria-label="Send message"
              disabled={!input.trim()}
            >
              <SendIcon />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.txt"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
