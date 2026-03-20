import { useState, useCallback, useEffect, useRef } from 'react'
import MessageList from './MessageList.jsx'
import MessageInput from './MessageInput.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'
import { useEncryption } from '../hooks/useEncryption.js'

export default function Chat({ userId, conversation, onUnread }) {
  const [messages, setMessages] = useState([])
  const [peerTyping, setPeerTyping] = useState(false)
  const typingTimerRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const { encrypt, decrypt } = useEncryption(userId)

  const conversationId = conversation?.id
  const recipientId = conversation?.recipientId

  const handleMessage = useCallback(
    async (data) => {
      if (data.type === 'reaction_update') {
        setMessages((prev) =>
          prev.map((m) =>
            (m.id || m._id) === data.messageId ? { ...m, reactions: data.reactions } : m
          )
        )
        return
      }
      if (data.type === 'delete_update') {
        setMessages((prev) =>
          prev.map((m) =>
            (m.id || m._id) === data.messageId ? { ...m, deleted: true, plaintext: '' } : m
          )
        )
        return
      }
      if (data.ack) return

      let plaintext = '🔒'
      try {
        if (!data.deleted && data.ciphertext && data.iv) {
          plaintext = await decrypt(data.ciphertext, data.iv, data.senderId)
        }
      } catch {}

      const msg = { ...data, plaintext, id: data.id || data._id }
      setMessages((prev) => {
        if (prev.some((m) => (m.id || m._id) === msg.id)) return prev
        return [...prev, msg]
      })

      if (data.senderId !== userId) {
        send('messages:read', { conversationId, lastMessageId: data.id })
        if (document.hidden && Notification.permission === 'granted') {
          new Notification('New message', {
            body: '🔒 Encrypted message',
            icon: '/favicon.ico',
            tag: conversationId
          })
        }
      }
    },
    [conversationId, userId, decrypt]
  )

  const handleTyping = useCallback(({ isTyping, userId: typerId }) => {
    if (typerId === userId) return
    setPeerTyping(isTyping)
    if (isTyping) {
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => setPeerTyping(false), 3000)
    }
  }, [userId])

  const handleReadReceipt = useCallback(({ lastMessageId }) => {
    setMessages((prev) =>
      prev.map((m) =>
        (m.id || m._id) === lastMessageId ? { ...m, readBy: [{ userId: recipientId }] } : m
      )
    )
  }, [recipientId])

  const { status, send } = useWebSocket({
    userId,
    onMessage: handleMessage,
    onTyping: handleTyping,
    onReadReceipt: handleReadReceipt
  })

  useEffect(() => {
    if (!conversationId) return
    setMessages([])
    setPeerTyping(false)
  }, [conversationId])

  async function onSend(text) {
    if (!recipientId) return
    const { ciphertext, iv } = await encrypt(text, recipientId)
    const tempId = crypto.randomUUID()
    setMessages((prev) => [
      ...prev,
      { id: tempId, senderId: userId, plaintext: text, ciphertext, iv, createdAt: new Date().toISOString(), reactions: [], readBy: [], replyToId: replyTo?.id || null }
    ])
    send('message', { recipientId, conversationId, ciphertext, iv, replyToId: replyTo?.id || null })
    setReplyTo(null)
  }

  function handleReact(messageId, emoji) {
    send('message:reaction', { messageId, emoji })
  }

  function handleDelete(messageId) {
    send('message:delete', { messageId })
    setMessages((prev) =>
      prev.map((m) => ((m.id || m._id) === messageId ? { ...m, deleted: true, plaintext: '' } : m))
    )
  }

  function onTyping(isTyping) {
    send(isTyping ? 'typing:start' : 'typing:stop', { conversationId })
  }

  const statusColor = status === 'connected' ? 'bg-green-500' : status === 'reconnecting' ? 'bg-yellow-500' : 'bg-red-500'

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600">
        Select a conversation
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-white font-medium">{conversation.name || conversation.recipientId}</span>
          {peerTyping && <span className="text-zinc-400 text-xs italic">typing…</span>}
        </div>
        <input
          type="text"
          placeholder="Search messages…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 w-48"
        />
      </div>

      <MessageList
        messages={messages}
        userId={userId}
        onReact={handleReact}
        onDelete={handleDelete}
        searchQuery={searchQuery}
      />

      <MessageInput
        onSend={onSend}
        onTyping={onTyping}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        disabled={status === 'failed'}
      />
    </div>
  )
}
