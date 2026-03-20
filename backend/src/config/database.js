import pg from 'pg'
import { config } from './env.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
})

export async function testDatabaseConnection() {
  const client = await pool.connect()
  try {
    await client.query('SELECT NOW()')
    console.log('[DB] Supabase connected ✓')
  } finally {
    client.release()
  }
}

export async function query(text, params) {
  const start = Date.now()
  const res = await pool.query(text, params)
  const duration = Date.now() - start
  if (duration > 500) console.warn(`[DB] Slow query (${duration}ms):`, text)
  return res
}
