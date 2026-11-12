import 'dotenv/config'

const port = Number(process.env.PORT ?? 4000)

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.isFinite(port) ? port : 4000,
  mongodbUri: process.env.MONGODB_URI ?? '',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}
