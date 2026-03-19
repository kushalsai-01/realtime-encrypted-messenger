import { createClient } from 'redis'

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
})

client.on('error', (err) => {
  console.error('Redis error:', err)
})

client.on('connect', () => {
  console.log('Redis connected')
})

const connectPromise = client.connect().catch((err) => {
  console.error('Failed to connect to Redis on startup:', err)
  process.exit(1)
})

export { client as default, connectPromise }
