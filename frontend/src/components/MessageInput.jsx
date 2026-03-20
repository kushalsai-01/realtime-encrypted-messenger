import { useState } from 'react'

export default function MessageInput({ onSend }) {
  const [value, setValue] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!value.trim()) return
    await onSend(value.trim())
    setValue('')
  }

  return (
    <form onSubmit={submit} className="border-t border-zinc-800 p-4 flex gap-2">
      <input
        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type message"
      />
      <button className="bg-blue-600 hover:bg-blue-500 rounded-md px-4 py-2">Send</button>
    </form>
  )
}
