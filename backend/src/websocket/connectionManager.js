const sockets = new Map()

export function addConnection(userId, ws) {
  sockets.set(userId, ws)
}

export function removeConnection(userId) {
  sockets.delete(userId)
}

export function getConnection(userId) {
  return sockets.get(userId) || null
}

export function getOnlineUsers() {
  return Array.from(sockets.keys())
}
