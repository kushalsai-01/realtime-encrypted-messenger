const STATUS_MAP = {
  connected: { dot: 'bg-green-500', label: 'Connected' },
  connecting: { dot: 'bg-yellow-500 animate-pulse', label: 'Connecting…' },
  reconnecting: { dot: 'bg-yellow-500 animate-pulse', label: 'Reconnecting…' },
  disconnected: { dot: 'bg-red-500', label: 'Disconnected' },
  failed: { dot: 'bg-red-600', label: 'Connection failed' },
  error: { dot: 'bg-red-500', label: 'Error' }
}

export default function UserStatus({ status, user, onLogout }) {
  const { dot, label } = STATUS_MAP[status] || STATUS_MAP.connecting

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-zinc-400 text-xs">{label}</span>
      </div>
      {user && (
        <div className="flex items-center gap-2">
          <span className="text-zinc-300 text-sm">{user.displayName}</span>
          <button
            onClick={onLogout}
            className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-2 py-0.5"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
