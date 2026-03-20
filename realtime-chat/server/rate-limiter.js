const WINDOW_MS = 60_000

const LIMITS = {
  CREATE_ROOM: 5,
  JOIN_ROOM: 10,
  MESSAGE: 60
}

/**
 * Sliding-window rate limiter keyed by connectionId and event type.
 * Helps protect the server and Redis from abusive clients.
 */
export class RateLimiter {
  constructor() {
    this.buckets = new Map()
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60_000)
  }

  getKey(connectionId, eventType) {
    return `${connectionId}:${eventType}`
  }

  /**
   * Check whether an event is allowed for a given connection.
   * @param {string} connectionId
   * @param {string} eventType
   * @returns {{ allowed: boolean, retryAfter?: number }}
   */
  check(connectionId, eventType) {
    const limit = LIMITS[eventType]
    if (!limit) return { allowed: true }

    const now = Date.now()
    const key = this.getKey(connectionId, eventType)
    let entry = this.buckets.get(key)
    if (!entry) {
      entry = { count: 0, windowStart: now }
      this.buckets.set(key, entry)
    }

    const elapsed = now - entry.windowStart
    if (elapsed > WINDOW_MS) {
      entry.windowStart = now
      entry.count = 0
    }

    entry.count += 1
    if (entry.count > limit) {
      const retryAfter = Math.ceil((WINDOW_MS - elapsed) / 1000)
      return { allowed: false, retryAfter }
    }

    return { allowed: true }
  }

  /**
   * Remove old buckets so the limiter does not grow unbounded in memory.
   */
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.buckets.entries()) {
      if (now - entry.windowStart > 10 * WINDOW_MS) {
        this.buckets.delete(key)
      }
    }
  }

  /**
   * Stop background cleanup when the process is shutting down.
   */
  stop() {
    clearInterval(this.cleanupInterval)
  }
}

