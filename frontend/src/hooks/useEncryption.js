import { useEffect, useRef } from 'react'
import { deriveKey } from '../crypto/keyManager.js'
import { decryptText, encryptText } from '../crypto/cipher.js'

export function useEncryption(roomSecret) {
  const keyRef = useRef(null)

  useEffect(() => {
    let alive = true
    deriveKey(roomSecret).then((k) => {
      if (alive) keyRef.current = k
    })
    return () => {
      alive = false
      keyRef.current = null
    }
  }, [roomSecret])

  async function encrypt(text) {
    if (!keyRef.current) throw new Error('Encryption key not ready')
    return encryptText(text, keyRef.current)
  }

  async function decrypt(ciphertext, iv) {
    if (!keyRef.current) throw new Error('Encryption key not ready')
    return decryptText(ciphertext, iv, keyRef.current)
  }

  return { encrypt, decrypt }
}
