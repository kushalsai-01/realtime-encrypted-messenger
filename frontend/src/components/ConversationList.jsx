import { useState, useEffect } from 'react'
import { api } from '../services/api.js'

export default function ConversationList({ userId, activeId, onSelect }) {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState([])

  useEffect(() => {
    api.get('/rooms')
      .then(({ data }) => setRooms(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!searchQ.trim() || searchQ.length < 2) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(searchQ)}`)
        setSearchResults(data.data || [])
      } catch {}
    }, 300)
    return () => clearTimeout(t)
  }, [searchQ])

  async function startDM(targetUserId) {
    try {
      const { data } = await api.post('/rooms/dm', { targetUserId })
      const room = data.data
      setRooms((prev) => prev.some((r) => r.id === room.id) ? prev : [room, ...prev])
      onSelect(room)
      setSearchQ('')
      setSearchResults([])
    } catch {}
  }

  async function createRoom() {
    const name = prompt('Room name')
    if (!name) return
    try {
      const { data } = await api.post('/rooms', { name })
      setRooms((prev) => [data.data, ...prev])
      onSelect(data.data)
    } catch {}
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-zinc-800 shrink-0">
        <input
          type="text"
          placeholder="Search users for DM…"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
        {searchResults.length > 0 && (
          <div className="mt-1 bg-zinc-800 border border-zinc-700 rounded-md overflow-hidden">
            {searchResults.map((u) => (
              <button
                key={u.id}
                onClick={() => startDM(u.id)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700"
              >
                {u.displayName}
                <span className="text-zinc-500 text-xs ml-1">{u.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="text-zinc-500 text-sm p-3">Loading…</p>}
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onSelect({ ...room, recipientId: room.is_direct ? room.other_user_id : null })}
            className={`w-full text-left px-3 py-3 border-b border-zinc-900 hover:bg-zinc-800 transition-colors flex items-center gap-2 ${
              activeId === room.id ? 'bg-zinc-800' : ''
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${room.is_direct ? 'bg-blue-800' : 'bg-zinc-700'}`}>
              {room.is_direct ? '👤' : '#'}
            </div>
            <span className="text-white text-sm truncate">{room.name || 'Direct Message'}</span>
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800 shrink-0">
        <button
          onClick={createRoom}
          className="w-full text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-md py-1.5 transition-colors"
        >
          + New room
        </button>
      </div>
    </div>
  )
}
