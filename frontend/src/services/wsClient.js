import { WS_URL } from './api.js'

export function connect({ userId }) {
  const url = `${WS_URL.replace(/\/$/, '')}/ws?userId=${encodeURIComponent(userId)}`
  return new WebSocket(url)
}
