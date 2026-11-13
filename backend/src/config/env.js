import 'dotenv/config'

const port = Number(process.env.PORT ?? 4000)
const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? 10)
const nodeEnv = process.env.NODE_ENV ?? 'development'
const isProduction = nodeEnv === 'production'

const DEV_JWT_SECRET = 'dev-only-insecure-jwt-secret-change-me-32-chars'

function resolveJwtSecret() {
  const value = process.env.JWT_SECRET
  if (value && value.length >= 32) return value

  if (isProduction) {
    throw new Error('JWT_SECRET must be set to at least 32 characters in production')
  }

  return DEV_JWT_SECRET
}

export const env = {
  nodeEnv,
  isProduction,
  isTest: nodeEnv === 'test',
  port: Number.isFinite(port) ? port : 4000,
  mongodbUri: process.env.MONGODB_URI ?? '',
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  bcryptRounds: 10,
  organization: {
    id: process.env.ORGANIZATION_ID ?? '',
    name: process.env.ORGANIZATION_NAME ?? 'Example Organization',
    slug: process.env.ORGANIZATION_SLUG ?? 'example-org',
  },
  admin: {
    name: process.env.ADMIN_NAME ?? '',
    email: (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD ?? '',
  },
  maxUploadMb: Number.isFinite(maxUploadMb) && maxUploadMb > 0 ? maxUploadMb : 10,
  attendanceTimezone: process.env.HRMS_TZ ?? 'Asia/Kolkata',
}
