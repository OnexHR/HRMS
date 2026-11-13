import cors from 'cors'
import express from 'express'
import helmet from 'helmet'

import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { apiRouter } from './routes/index.js'

export const app = express()

app.disable('x-powered-by')

app.use(
  helmet({
    // Files are streamed from this origin and consumed by the SPA.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)

app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
)

app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } })
})

app.use('/api/v1', apiRouter)

app.use(notFoundHandler)
app.use(errorHandler)
