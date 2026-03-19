import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import * as roomManagerModule from '../room-manager.js'

jest.unstable_mockModule('../redis-client.js', () => {
  const store = new Map()
  return {
    default: {
      exists: jest.fn(async (k) => (store.has(k) ? 1 : 0)),
      setEx: jest.fn(async (k) => {
        store.set(k, 'v')
      }),
      get: jest.fn(async (k) => store.get(k) || null),
    },
  }
})

describe('room-manager', () => {
  it('generateRoomCode returns 20-char base32', () => {
    const code = roomManagerModule.__get__('generateRoomCode')()
    expect(code).toHaveLength(20)
    expect(/^[A-Z2-7]{20}$/.test(code)).toBe(true)
  })
})

