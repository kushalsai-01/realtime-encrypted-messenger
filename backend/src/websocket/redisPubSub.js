import { redisPublisher, redisSubscriber } from '../config/redis.js'

const CHANNEL = 'cipherlink:ws'

export function publish(payload) {
  return redisPublisher.publish(CHANNEL, JSON.stringify(payload))
}

export function subscribe(onMessage) {
  redisSubscriber.subscribe(CHANNEL)
  redisSubscriber.on('message', (channel, message) => {
    if (channel !== CHANNEL) return
    try {
      onMessage(JSON.parse(message))
    } catch {
      console.warn('[WS] Invalid pubsub payload')
    }
  })
}
