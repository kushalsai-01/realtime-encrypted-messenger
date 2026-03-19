export async function deriveRoomKey(roomCode) {
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(roomCode),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('realtime-chat-v1-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptMessage(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  return {
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext))
  }
}

export async function decryptMessage(key, iv, ciphertext) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(ciphertext)
  )
  return new TextDecoder().decode(decrypted)
}

/**
 * Encrypt a binary file payload with AES-GCM.
 * Using the same Web Crypto primitives as messages keeps the E2EE model consistent.
 * @param {ArrayBuffer} buffer
 * @param {CryptoKey} key
 * @returns {Promise<{ encryptedBuffer: ArrayBuffer, iv: Uint8Array }>}
 */
export async function encryptFile(buffer, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buffer)
  return { encryptedBuffer, iv }
}

/**
 * Decrypt an AES-GCM encrypted file payload back to raw bytes.
 * This allows the receiver to reconstruct the original file without the server ever seeing plaintext.
 * @param {ArrayBuffer} encryptedBuffer
 * @param {Uint8Array} iv
 * @param {CryptoKey} key
 * @returns {Promise<ArrayBuffer>}
 */
export async function decryptFile(encryptedBuffer, iv, key) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedBuffer)
}
