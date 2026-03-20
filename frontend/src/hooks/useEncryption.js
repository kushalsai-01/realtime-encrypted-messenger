import { useCallback } from 'react'
import { encryptText, decryptText } from '../crypto/cipher.js'
import { getSharedKey } from '../services/keyExchange.js'

export function useEncryption(myUserId) {
  const encrypt = useCallback(
    async (text, recipientId) => {
      const key = await getSharedKey(myUserId, recipientId)
      return encryptText(text, key)
    },
    [myUserId]
  )

  const decrypt = useCallback(
    async (ciphertext, iv, senderId) => {
      const key = await getSharedKey(myUserId, senderId)
      return decryptText(ciphertext, iv, key)
    },
    [myUserId]
  )

  return { encrypt, decrypt }
}
