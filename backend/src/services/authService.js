import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../config/database.js'
import { config } from '../config/env.js'

export async function register({ email, password, displayName }) {
  const existing = await query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
  if (existing.rowCount > 0) throw Object.assign(new Error('Email already exists'), { status: 409 })
  const passwordHash = await bcrypt.hash(password, 10)
  const id = uuidv4()
  await query(
    'INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
    [id, email, passwordHash, displayName]
  )
  return { id, email, displayName }
}

export async function login({ email, password }) {
  const result = await query('SELECT id, email, password_hash, display_name FROM users WHERE email = $1 LIMIT 1', [email])
  if (result.rowCount === 0) throw Object.assign(new Error('Invalid credentials'), { status: 401 })
  const row = result.rows[0]
  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 })
  const payload = { sub: row.id, email: row.email, name: row.display_name }
  const accessToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN })
  const refreshToken = jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN })
  return { accessToken, refreshToken, user: { id: row.id, email: row.email, displayName: row.display_name } }
}
