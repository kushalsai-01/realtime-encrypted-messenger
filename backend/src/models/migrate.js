import { query } from '../config/database.js'

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`
]

async function run() {
  for (const sql of statements) await query(sql)
  console.log('[Migrate] Completed')
  process.exit(0)
}

run().catch((err) => {
  console.error('[Migrate] Failed', err)
  process.exit(1)
})
