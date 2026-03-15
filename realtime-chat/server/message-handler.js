import { joinRoom, removeFromRoom } from './room-manager.js'

const rooms = new Map()

export function handleConnection(ws, userId, roomCode) {
  console.log(`User ${userId} connected, room: ${roomCode || 'none'}`)

  ws.userId = userId
  ws.roomCode = roomCode
  ws.isAlive = true

  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', async (data) => {
    let message
    try {
      message = JSON.parse(data.toString())
    } catch {
      return sendTo(ws, { type: 'ERROR', payload: 'Invalid JSON' })
    }
    await routeMessage(ws, message)
  })

  ws.on('close', async () => {
    await handleDisconnect(ws)
  })

  ws.on('error', (err) => {
    console.error(`WebSocket error for user ${userId}:`, err.message)
  })
}

async function routeMessage(ws, message) {
  const { type, payload } = message

  switch (type) {
    case 'CREATE_ROOM': {
      const room = await createRoomAndJoin(ws, ws.userId)
      if (room.error) return sendTo(ws, { type: 'ERROR', payload: room.error })
      sendTo(ws, { type: 'ROOM_CREATED', payload: { code: room.code } })
      break
    }

    case 'JOIN_ROOM': {
      const { code } = payload
      const room = await joinRoom(code, ws.userId)
      if (room.error) return sendTo(ws, { type: 'ERROR', payload: room.error })

      ws.roomCode = code
      addToRoomMap(code, ws)

      sendTo(ws, { type: 'JOINED_ROOM', payload: { code, memberCount: room.members.length } })

      broadcastToOthers(code, ws.userId, { type: 'PEER_JOINED', payload: { userId: ws.userId } })
      break
    }

    case 'MESSAGE': {
      if (!ws.roomCode) return sendTo(ws, { type: 'ERROR', payload: 'Not in a room' })
      broadcastToOthers(ws.roomCode, ws.userId, {
        type: 'MESSAGE',
        from: ws.userId,
        payload,
        timestamp: Date.now()
      })
      break
    }

    case 'TYPING': {
      if (!ws.roomCode) return
      broadcastToOthers(ws.roomCode, ws.userId, {
        type: 'TYPING',
        from: ws.userId,
        payload: { isTyping: payload.isTyping }
      })
      break
    }

    case 'LEAVE_ROOM': {
      await handleDisconnect(ws)
      break
    }

    default:
      sendTo(ws, { type: 'ERROR', payload: `Unknown message type: ${type}` })
  }
}

async function createRoomAndJoin(ws, userId) {
  const { createRoom } = await import('./room-manager.js')
  const room = await createRoom(userId)
  ws.roomCode = room.code
  addToRoomMap(room.code, ws)
  return room
}

async function handleDisconnect(ws) {
  const { roomCode, userId } = ws
  if (!roomCode) return

  removeFromRoomMap(roomCode, ws)
  await removeFromRoom(roomCode, userId)

  broadcastToOthers(roomCode, userId, {
    type: 'PEER_LEFT',
    payload: { userId }
  })

  console.log(`User ${userId} left room ${roomCode}`)
}

function addToRoomMap(code, ws) {
  if (!rooms.has(code)) rooms.set(code, new Set())
  rooms.get(code).add(ws)
}

function removeFromRoomMap(code, ws) {
  const room = rooms.get(code)
  if (!room) return
  room.delete(ws)
  if (room.size === 0) rooms.delete(code)
}

function broadcastToOthers(code, senderId, message) {
  const room = rooms.get(code)
  if (!room) return
  const data = JSON.stringify(message)
  room.forEach((client) => {
    if (client.userId !== senderId && client.readyState === 1) {
      client.send(data)
    }
  })
}

function sendTo(ws, message) {
  if (ws.readyState === 1) ws.send(JSON.stringify(message))
}

export function startHeartbeat(wss) {
  setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        console.log(`Terminating dead connection: ${ws.userId}`)
        return ws.terminate()
      }
      ws.isAlive = false
      ws.ping()
    })
  }, 30000)
}
