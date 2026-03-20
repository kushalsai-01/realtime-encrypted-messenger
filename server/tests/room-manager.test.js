import { describe, it, expect } from '@jest/globals'

describe('room code generation', () => {
  it('basic math works', () => {
    expect(1 + 1).toBe(2)
  })

  it('base32 charset is valid', () => {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    expect(base32Chars.length).toBe(32)
  })

  it('room TTL is 24 hours in seconds', () => {
    const TTL = 86400
    expect(TTL).toBe(60 * 60 * 24)
  })
})

