import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Chat from './components/Chat.jsx'
import ConversationList from './components/ConversationList.jsx'
import UserStatus from './components/UserStatus.jsx'
import { useAuth } from './hooks/useAuth.js'
import { useWebSocket } from './hooks/useWebSocket.js'
import { getOrCreateKeyPair } from './services/keyExchange.js'

function ChatApp() {
  const { user, logout } = useAuth()
  const [activeConversation, setActiveConversation] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [mobileView, setMobileView] = useState('list')

  const { status } = useWebSocket({
    userId: user?.id,
    onPresence: ({ userId, status: s }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (s === 'online') next.add(userId)
        else next.delete(userId)
        return next
      })
    }
  })

  useEffect(() => {
    if (!user) return
    if (Notification.permission === 'default') Notification.requestPermission()
    getOrCreateKeyPair(user.id).catch(() => {})
  }, [user?.id])

  function handleSelectConversation(conv) {
    setActiveConversation(conv)
    setMobileView('chat')
  }

  return (
    <div className="min-h-screen h-screen bg-black text-white flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {mobileView === 'chat' && (
            <button
              className="md:hidden text-zinc-400 hover:text-white mr-1"
              onClick={() => setMobileView('list')}
            >
              ←
            </button>
          )}
          <h1 className="text-lg font-semibold">🔐 CipherLink</h1>
        </div>
        <UserStatus status={status} user={user} onLogout={logout} />
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside
          className={`w-full md:w-72 border-r border-zinc-800 shrink-0 ${
            mobileView === 'list' ? 'flex' : 'hidden md:flex'
          } flex-col`}
        >
          <ConversationList
            userId={user?.id}
            activeId={activeConversation?.id}
            onSelect={handleSelectConversation}
            onlineUsers={onlineUsers}
          />
        </aside>

        <section
          className={`flex-1 overflow-hidden ${
            mobileView === 'chat' ? 'flex' : 'hidden md:flex'
          } flex-col`}
        >
          <Chat
            userId={user?.id}
            conversation={activeConversation}
          />
        </section>
      </main>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
