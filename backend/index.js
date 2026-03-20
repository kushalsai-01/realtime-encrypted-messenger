import { createServer } from './src/app.js'
import { config } from './src/config/env.js'

const { server } = createServer()

server.listen(config.PORT, () => {
  console.log(`[Server] Listening on ${config.PORT}`)
})
