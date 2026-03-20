import { useState } from 'react'
import MessageList from './MessageList.jsx'
import MessageInput from './MessageInput.jsx'
import { useWebSocket } from '../hooks/useWebSocket.js'

export default function Chat({ userId, conversationId, encrypt }) {
  const [messages, setMessages] = useState([])
  const { send } = useWebSocket({ userId, decrypt: async () => '' })

  async function onSend(text) {
    const encrypted = await encrypt(text)
    const packet = { conversationId, recipientId: 'peer', ...encrypted }
    send(packet)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), senderId: userId, text }])
  }

  return (
    <div className="h-full flex flex-col">
      <MessageList messages={messages} userId={userId} />
      <MessageInput onSend={onSend} />
    </div>
  )
}
