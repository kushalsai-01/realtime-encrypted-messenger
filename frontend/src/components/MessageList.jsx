export default function MessageList({ messages, userId }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {messages.map((m) => (
        <div key={m.id} className={`max-w-[70%] rounded-lg px-3 py-2 ${m.senderId === userId ? 'ml-auto bg-blue-700' : 'bg-zinc-800'}`}>
          <p className="text-sm">{m.text}</p>
        </div>
      ))}
    </div>
  )
}
