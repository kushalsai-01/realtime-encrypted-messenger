import mongoose from 'mongoose'
import { config } from './env.js'

export async function connectMongoDB() {
  await mongoose.connect(config.MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000
  })
  console.log('[MongoDB] Atlas connected ✓')
}

mongoose.connection.on('disconnected', () => console.warn('[MongoDB] Disconnected'))

export { mongoose }
