import { WS_URL } from './api'

/**
 * Build WebSocket base URL.
 * Uses VITE_WS_URL when provided; otherwise derives from the current page protocol.
 */
export function buildWsBase() {
  if (WS_URL) return WS_URL
  return window.location.protocol === 'https:'
    ? `wss://${window.location.host}`
    : `ws://${window.location.host}`
}

/**
 * Build full WebSocket URL for connecting to the chat backend.
 * @param {{ userId: string, roomCode?: string | null, token?: string }} params
 * @returns {string}
 */
export function buildWsUrl({ userId, roomCode = '', token }) {
  const wsBase = buildWsBase()
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : ''
  return `${wsBase}/ws?userId=${encodeURIComponent(userId)}&room=${encodeURIComponent(
    roomCode || ''
  )}${tokenQuery}`
}

/**
 * Create a WebSocket instance.
 * @param {{ userId: string, roomCode?: string | null, token?: string }} params
 * @returns {WebSocket}
 */
export function connectWs({ userId, roomCode = '', token }) {
  return new WebSocket(buildWsUrl({ userId, roomCode, token }))
}

/**
 * Connect wrapper for compatibility with deployment configuration.
 * @param {{ userId: string, roomCode?: string | null, token?: string }} params
 * @returns {WebSocket}
 */
export function connect(params) {
  return connectWs(params)
}

