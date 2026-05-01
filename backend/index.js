import { createServer } from './src/app.js'
import { config } from './src/config/env.js'

// IMP-G4: Graceful shutdown on SIGTERM/SIGINT (required for Kubernetes pod termination)
async function main() {
  const { server } = await createServer()

  server.listen(config.PORT, () => {
    console.log(`[Server] Listening on port ${config.PORT} (${config.NODE_ENV})`)
  })

  function shutdown(signal) {
    console.log(`[Server] ${signal} received — shutting down gracefully`)
    server.close(() => {
      console.log('[Server] HTTP server closed')
      process.exit(0)
    })
    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('[Server] Forced exit after timeout')
      process.exit(1)
    }, 10000).unref()
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('[Server] Fatal startup error:', err)
  process.exit(1)
})
