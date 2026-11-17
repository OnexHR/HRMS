import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'

/**
 * Express application configuration only.
 * Feature modules will be mounted under /api/v1 as they are implemented.
 */
export const app = express()

app.disable('x-powered-by')
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Not found' },
  })
})
