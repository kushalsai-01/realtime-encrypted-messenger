import { useMemo, useState } from 'react'
import Chat from './components/Chat.jsx'
import ConversationList from './components/ConversationList.jsx'
import UserStatus from './components/UserStatus.jsx'
import { useEncryption } from './hooks/useEncryption.js'
import { useWebSocket } from './hooks/useWebSocket.js'

export default function App() {
  const [activeConversationId, setActiveConversationId] = useState('general')
  const userId = useMemo(() => crypto.randomUUID(), [])
  const { encrypt, decrypt } = useEncryption('cipherlink-room-key')
  const { status } = useWebSocket({ userId, conversationId: activeConversationId, decrypt })

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">CipherLink</h1>
        <UserStatus status={status} />
      </header>
      <main className="grid grid-cols-12 min-h-[calc(100vh-73px)]">
        <aside className="col-span-3 border-r border-zinc-800">
          <ConversationList activeConversationId={activeConversationId} onSelect={setActiveConversationId} />
        </aside>
        <section className="col-span-9">
          <Chat userId={userId} conversationId={activeConversationId} encrypt={encrypt} />
        </section>
      </main>
    </div>
  )
}
