import { useState, useRef } from 'react'

export default function MessageInput({ onSend, onTyping, replyTo, onCancelReply, disabled }) {
  const [value, setValue] = useState('')
  const typingTimer = useRef(null)

  function handleChange(e) {
    setValue(e.target.value)
    onTyping?.(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => onTyping?.(false), 2000)
  }

  function handleKeyDown(e) {
    if ((e.key === 'Enter' && !e.shiftKey) || (e.key === 'Enter' && e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  async function submit() {
    const text = value.trim()
    if (!text || disabled) return
    setValue('')
    onTyping?.(false)
    clearTimeout(typingTimer.current)
    await onSend(text)
  }

  return (
    <div className="border-t border-zinc-800" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-xs text-zinc-400 border-b border-zinc-800">
          <span className="border-l-2 border-blue-500 pl-2">Replying to 🔒 Encrypted message</span>
          <button onClick={onCancelReply} className="ml-auto text-zinc-500 hover:text-white">✕</button>
        </div>
      )}
      <div className="flex items-end gap-2 p-3">
        <textarea
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-blue-500 max-h-40 overflow-y-auto"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
          rows={1}
          disabled={disabled}
          style={{ fieldSizing: 'content' }}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl px-4 py-2 text-white font-medium transition-colors shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  )
}
