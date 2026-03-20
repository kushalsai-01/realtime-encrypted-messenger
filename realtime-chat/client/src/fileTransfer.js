import { v4 as uuidv4 } from 'uuid'
import { encryptFile, decryptFile } from './crypto'

const CHUNK_SIZE = 16 * 1024

function bytesToBase64(bytes) {
  let binary = ''
  const len = bytes.length
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBytes(base64) {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Encrypts a file and streams it as fixed-size chunks over a callback.
 * This keeps large files off the main thread while preserving end-to-end encryption guarantees.
 * @param {File} file
 * @param {string} roomCode
 * @param {CryptoKey} cryptoKey
 * @param {(msg: any) => void} sendChunk
 * @returns {{ onProgress: (cb: (percent: number) => void) => void }}
 */
export function sendFile(file, roomCode, cryptoKey, sendChunk) {
  let progressHandler = null

  const reader = new FileReader()
  reader.onload = async () => {
    const buffer = reader.result
    if (!(buffer instanceof ArrayBuffer)) return

    const { encryptedBuffer, iv } = await encryptFile(buffer, cryptoKey)
    const encryptedBytes = new Uint8Array(encryptedBuffer)
    const totalChunks = Math.ceil(encryptedBytes.length / CHUNK_SIZE)
    const ivB64 = bytesToBase64(iv)
    const transferId = uuidv4()

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, encryptedBytes.length)
      const chunk = encryptedBytes.subarray(start, end)
      const encryptedChunk = bytesToBase64(chunk)

      sendChunk({
        type: 'FILE_CHUNK',
        transferId,
        chunkIndex: i,
        totalChunks,
        encryptedChunk,
        iv: ivB64,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        roomCode
      })

      if (progressHandler) {
        const percent = Math.round(((i + 1) / totalChunks) * 100)
        progressHandler(percent)
      }
    }

    sendChunk({
      type: 'FILE_TRANSFER_COMPLETE',
      transferId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      roomCode
    })
  }

  reader.readAsArrayBuffer(file)

  return {
    onProgress(cb) {
      progressHandler = cb
    }
  }
}

/**
 * Accumulates encrypted file chunks and reconstructs blobs once all chunks arrive.
 * This keeps reassembly state local to the browser and never exposes plaintext to the server.
 * @param {any} chunkMsg
 * @param {Map<string, { chunks: string[], totalChunks: number, fileName: string, fileType: string, fileSize: number, iv: string }>} pendingTransfers
 * @param {CryptoKey} cryptoKey
 * @returns {Promise<{ done: boolean, progress?: number, file?: Blob, fileName?: string, fileType?: string }>}
 */
export async function receiveChunk(chunkMsg, pendingTransfers, cryptoKey) {
  if (chunkMsg.type !== 'FILE_CHUNK') {
    return { done: false }
  }

  const {
    transferId,
    chunkIndex,
    totalChunks,
    encryptedChunk,
    iv,
    fileName,
    fileType,
    fileSize
  } = chunkMsg

  if (!pendingTransfers.has(transferId)) {
    pendingTransfers.set(transferId, {
      chunks: new Array(totalChunks).fill(null),
      totalChunks,
      fileName,
      fileType,
      fileSize,
      iv
    })
  }

  const state = pendingTransfers.get(transferId)
  state.chunks[chunkIndex] = encryptedChunk

  const received = state.chunks.filter(Boolean).length
  const progress = Math.round((received / state.totalChunks) * 100)

  if (received < state.totalChunks) {
    return { done: false, progress }
  }

  const allBytes = []
  state.chunks.forEach((c) => {
    if (c) {
      allBytes.push(base64ToBytes(c))
    }
  })

  let totalLength = 0
  allBytes.forEach((b) => {
    totalLength += b.length
  })

  const merged = new Uint8Array(totalLength)
  let offset = 0
  allBytes.forEach((b) => {
    merged.set(b, offset)
    offset += b.length
  })

  const ivBytes = base64ToBytes(state.iv)
  const decryptedBuffer = await decryptFile(merged.buffer, ivBytes, cryptoKey)

  const blob = new Blob([decryptedBuffer], { type: state.fileType || 'application/octet-stream' })

  pendingTransfers.delete(transferId)

  return {
    done: true,
    progress: 100,
    file: blob,
    fileName: state.fileName,
    fileType: state.fileType
  }
}

