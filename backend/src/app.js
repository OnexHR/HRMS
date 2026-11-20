import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import authRoutes from './modules/auth/routes/authRoutes.js'
import organizationRegistrationRoutes from './modules/organization-registration/routes/organizationRegistrationRoutes.js'

/**
 * Express application configuration only.
 * Feature modules will be mounted under /api/v1 as they are implemented.
 */
export const app = express()

function isLocalDevelopmentOrigin(origin) {
  if (env.nodeEnv === 'production') return false

  try {
    const url = new URL(origin)
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  } catch {
    return false
  }
}

app.disable('x-powered-by')
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || env.corsOrigins.includes(origin) || isLocalDevelopmentOrigin(origin))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/organization-registration', organizationRegistrationRoutes)

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Not found' },
  })
})
