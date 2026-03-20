import dotenv from 'dotenv'

dotenv.config()

const required = [
  'DATABASE_URL',
  'MONGODB_URI',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'UPSTASH_REDIS_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
]

const missing = required.filter((k) => !process.env[k])
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:')
  missing.forEach((k) => console.error(`   ${k}`))
  console.error('\nCopy backend/.env.example to backend/.env and fill in the values.')
  process.exit(1)
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters')
  process.exit(1)
}

if (process.env.JWT_REFRESH_SECRET.length < 32) {
  console.error('❌ JWT_REFRESH_SECRET must be at least 32 characters')
  process.exit(1)
}

if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
  console.error('❌ JWT_SECRET and JWT_REFRESH_SECRET must be different')
  process.exit(1)
}

export const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SERVER_ID: process.env.SERVER_ID || 'local',
  DATABASE_URL: process.env.DATABASE_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173'
}
