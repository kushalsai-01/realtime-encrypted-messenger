const items = [
  { id: 'general', label: 'General' },
  { id: 'team', label: 'Team' },
  { id: 'private', label: 'Private' }
]

export default function ConversationList({ activeConversationId, onSelect }) {
  return (
    <div className="p-4 space-y-2">
      {items.map((item) => (
        <button
          key={item.id}
          className={`w-full rounded-md px-3 py-2 text-left ${
            activeConversationId === item.id ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-300'
          }`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
