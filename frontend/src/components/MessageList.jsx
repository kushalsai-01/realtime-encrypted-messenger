import { useEffect, useRef } from 'react'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡']

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageList({ messages, userId, onReact, onDelete, searchQuery }) {
  const bottomRef = useRef(null)
  const listRef = useRef(null)
  const atBottomRef = useRef(true)

  useEffect(() => {
    if (atBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleScroll() {
    const el = listRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const filtered = searchQuery
    ? messages.filter((m) =>
        !m.deleted && m.plaintext?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages

  return (
    <div
      ref={listRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-2"
    >
      {filtered.map((m) => {
        const isMine = m.senderId === userId
        const reactionGroups = {}
        for (const r of m.reactions || []) {
          reactionGroups[r.emoji] = (reactionGroups[r.emoji] || 0) + 1
        }
        const isRead = (m.readBy || []).some((r) => r.userId !== userId)

        return (
          <div
            key={m.id || m._id}
            className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
          >
            <div className="max-w-[70%]">
              {m.replyToId && (
                <div className="text-xs text-zinc-500 mb-1 pl-2 border-l-2 border-zinc-600">
                  🔒 Encrypted message
                </div>
              )}

              <div
                className={`relative rounded-xl px-3 py-2 ${
                  m.deleted
                    ? 'bg-zinc-800 italic text-zinc-500'
                    : isMine
                    ? 'bg-blue-700 text-white'
                    : 'bg-zinc-800 text-white'
                }`}
              >
                {m.deleted ? (
                  <span className="text-sm">This message was deleted</span>
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {m.plaintext || m.text || '🔒'}
                  </p>
                )}

                <div
                  className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <span className="text-[10px] text-zinc-400">{formatTime(m.createdAt)}</span>
                  {isMine && isRead && <span className="text-[10px] text-blue-300">✓✓</span>}
                  {isMine && !isRead && <span className="text-[10px] text-zinc-500">✓</span>}
                </div>

                {!m.deleted && (
                  <div
                    className={`absolute top-0 hidden group-hover:flex gap-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-1 z-10 ${
                      isMine ? 'right-full mr-2' : 'left-full ml-2'
                    }`}
                  >
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => onReact?.(m.id || m._id, e)}
                        className="text-base hover:scale-125 transition-transform px-0.5"
                        title={e}
                      >
                        {e}
                      </button>
                    ))}
                    {isMine && (
                      <button
                        onClick={() => onDelete?.(m.id || m._id)}
                        className="text-xs text-red-400 hover:text-red-300 px-1 ml-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {Object.entries(reactionGroups).length > 0 && (
                <div
                  className={`flex flex-wrap gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {Object.entries(reactionGroups).map(([emoji, count]) => (
                    <button
                      key={emoji}
                      onClick={() => onReact?.(m.id || m._id, emoji)}
                      className="bg-zinc-800 hover:bg-zinc-700 rounded-full px-2 py-0.5 text-xs border border-zinc-700"
                    >
                      {emoji} {count}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
