const enc = new TextEncoder()

export async function deriveKey(roomSecret) {
  const base = await crypto.subtle.importKey('raw', enc.encode(roomSecret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('cipherlink-salt'), iterations: 100000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
