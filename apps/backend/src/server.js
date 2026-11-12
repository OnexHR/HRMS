import { app } from './app.js'
import { connectDatabase, disconnectDatabase } from './config/database.js'
import { env } from './config/env.js'

let server

async function start() {
  if (env.mongodbUri) {
    await connectDatabase()
    console.log('MongoDB connected')
  } else {
    console.warn('MONGODB_URI is not set; starting without a database connection')
  }

  server = app.listen(env.port, () => {
    console.log(`HRMS API listening on http://localhost:${env.port}`)
  })
}

async function shutdown(signal) {
  console.log(`\n${signal} received, shutting down...`)

  if (server) {
    await new Promise((resolve) => server.close(resolve))
  }

  await disconnectDatabase()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

start().catch((error) => {
  console.error('Failed to start the API:', error.message)
  process.exit(1)
})
