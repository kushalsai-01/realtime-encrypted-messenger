const enc = new TextEncoder()
const dec = new TextDecoder()

function toBase64(bytes) {
  let str = ''
  const arr = new Uint8Array(bytes)
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i])
  return btoa(str)
}

function fromBase64(value) {
  const raw = atob(value)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function encryptText(text, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text))
  return { ciphertext: toBase64(cipher), iv: toBase64(iv) }
}

export async function decryptText(ciphertext, iv, key) {
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext)
  )
  return dec.decode(plain)
}
