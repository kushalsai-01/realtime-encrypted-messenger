import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes, createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/database.js'
import { redis } from '../config/redis.js'
import { config } from '../config/env.js'

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function msUntilExpiry(expiresIn) {
  const units = { m: 60, h: 3600, d: 86400 }
  const match = String(expiresIn).match(/^(\d+)([mhd])$/)
  if (!match) return 15 * 60 * 1000
  return parseInt(match[1]) * units[match[2]] * 1000
}

async function createSession(userId, ip, deviceName) {
  const refreshToken = randomBytes(40).toString('hex')
  const hash = hashToken(refreshToken)
  const id = uuidv4()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await query(
    `INSERT INTO sessions (id, user_id, refresh_token_hash, device_name, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, hash, deviceName || 'unknown', ip || null, expiresAt]
  )
  return { sessionId: id, refreshToken }
}

export async function register({ email, password, displayName }, meta = {}) {
  const existing = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
  if (existing.rowCount > 0) throw Object.assign(new Error('Email already exists'), { status: 409 })
  const passwordHash = await bcrypt.hash(password, 10)
  const id = uuidv4()
  await query(
    'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
    [id, email, passwordHash, displayName]
  )
  const user = { id, email, displayName }
  const tokens = await issueTokens(user, meta)
  return { user, tokens }
}

export async function login({ email, password }, meta = {}) {
  const result = await query(
    'SELECT id, email, password_hash, display_name FROM users WHERE email = $1 LIMIT 1',
    [email]
  )
  if (result.rowCount === 0) throw Object.assign(new Error('Invalid credentials'), { status: 401 })
  const row = result.rows[0]
  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 })
  const user = { id: row.id, email: row.email, displayName: row.display_name }
  const tokens = await issueTokens(user, meta)
  return { user, tokens }
}

async function issueTokens(user, meta) {
  const jti = uuidv4()
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, name: user.displayName, jti },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  )
  const { refreshToken } = await createSession(user.id, meta.ip, meta.deviceName)
  return { accessToken, refreshToken }
}

export async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) throw Object.assign(new Error('Refresh token required'), { status: 401 })
  const hash = hashToken(rawRefreshToken)
  const result = await query(
    `SELECT s.id, s.user_id, s.expires_at, s.device_name, s.ip_address,
            u.email, u.display_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.refresh_token_hash = $1 LIMIT 1`,
    [hash]
  )
  if (result.rowCount === 0) throw Object.assign(new Error('Invalid refresh token'), { status: 401 })
  const session = result.rows[0]
  if (new Date(session.expires_at) < new Date())
    throw Object.assign(new Error('Refresh token expired'), { status: 401 })

  await query('DELETE FROM sessions WHERE id = $1', [session.id])

  const user = { id: session.user_id, email: session.email, displayName: session.display_name }
  const jti = uuidv4()
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, name: user.displayName, jti },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  )
  const { refreshToken: newRefreshToken } = await createSession(
    user.id,
    session.ip_address,
    session.device_name
  )
  return { accessToken, refreshToken: newRefreshToken }
}

export async function logout(jti, rawRefreshToken) {
  if (jti) {
    const ttlMs = msUntilExpiry(config.JWT_EXPIRES_IN)
    await redis.set(`blacklist:${jti}`, '1', { ex: Math.ceil(ttlMs / 1000) })
  }
  if (rawRefreshToken) {
    const hash = hashToken(rawRefreshToken)
    await query('DELETE FROM sessions WHERE refresh_token_hash = $1', [hash])
  }
}

export async function listSessions(userId) {
  const result = await query(
    `SELECT id, device_name, ip_address, last_seen, expires_at, created_at
     FROM sessions WHERE user_id = $1 ORDER BY last_seen DESC`,
    [userId]
  )
  return result.rows
}

export async function revokeSession(sessionId, userId) {
  const result = await query(
    'DELETE FROM sessions WHERE id = $1 AND user_id = $2 RETURNING id',
    [sessionId, userId]
  )
  if (result.rowCount === 0) throw Object.assign(new Error('Session not found'), { status: 404 })
}

export async function revokeAllSessions(userId) {
  await query('DELETE FROM sessions WHERE user_id = $1', [userId])
}
