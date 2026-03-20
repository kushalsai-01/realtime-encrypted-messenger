function toBase64(bytes) {
  let s = ''
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i])
  return btoa(s)
}

function fromBase64(b64) {
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function generateKeyPair() {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )
}

export async function exportPublicKey(key) {
  const spki = await crypto.subtle.exportKey('spki', key)
  return toBase64(spki)
}

export async function importPublicKey(b64) {
  const bytes = fromBase64(b64)
  return crypto.subtle.importKey(
    'spki',
    bytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )
}

export async function deriveSharedKey(myPrivateKey, theirPublicKeyB64) {
  const theirPublicKey = await importPublicKey(theirPublicKeyB64)
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
