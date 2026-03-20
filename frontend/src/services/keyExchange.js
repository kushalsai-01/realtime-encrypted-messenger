import { generateKeyPair, exportPublicKey, deriveSharedKey } from '../crypto/keyManager.js'
import { saveKeyPair, loadKeyPair } from '../crypto/keyStore.js'
import { api } from './api.js'

const sharedKeyCache = new Map()

export async function getOrCreateKeyPair(userId) {
  let kp = await loadKeyPair(userId)
  if (!kp) {
    kp = await generateKeyPair()
    await saveKeyPair(userId, kp)
    const publicKeyB64 = await exportPublicKey(kp.publicKey)
    await api.post('/users/public-key', { publicKey: publicKeyB64 })
  }
  return kp
}

export async function getSharedKey(myUserId, theirUserId) {
  const cacheKey = `${myUserId}:${theirUserId}`
  if (sharedKeyCache.has(cacheKey)) return sharedKeyCache.get(cacheKey)

  const myKp = await getOrCreateKeyPair(myUserId)
  const { data } = await api.get(`/users/${theirUserId}/public-key`)
  const sharedKey = await deriveSharedKey(myKp.privateKey, data.publicKey)
  sharedKeyCache.set(cacheKey, sharedKey)
  return sharedKey
}

export function clearSharedKeyCache() {
  sharedKeyCache.clear()
}
