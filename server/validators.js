const ROOM_CODE_REGEX = /^[A-Z2-7]{20}$/
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const TYPES = new Set([
  'CREATE_ROOM',
  'JOIN_ROOM',
  'MESSAGE',
  'TYPING',
  'LEAVE_ROOM',
  'FILE_CHUNK',
  'FILE_TRANSFER_COMPLETE',
  'FILE_TRANSFER_ERROR'
])

/**
 * Validate the shape of an incoming WebSocket message.
 * This reduces the risk of crashes and abuse from malformed payloads.
 * @param {import('ws')} ws
 * @param {any} message
 * @returns {boolean}
 */
export function validateMessage(ws, message) {
  if (!message || typeof message.type !== 'string' || !TYPES.has(message.type)) {
    return false
  }

  if (!UUID_V4_REGEX.test(ws.userId)) return false

  if (message.type === 'JOIN_ROOM') {
    const code = message.payload?.code
    if (typeof code !== 'string' || !ROOM_CODE_REGEX.test(code)) return false
  }

  if (message.type === 'MESSAGE') {
    const ciphertext = message.payload?.ciphertext
    if (!Array.isArray(ciphertext)) return false
    if (ciphertext.length > 20000) return false
  }

  return true
}

