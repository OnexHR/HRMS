import 'dotenv/config'

const port = Number(process.env.PORT ?? 4000)

const demoAccounts = [
  { id: process.env.DEMO_ADMIN_ID ?? '', password: process.env.DEMO_ADMIN_PASSWORD ?? '', role: 'admin' },
  { id: process.env.DEMO_MANAGER_ID ?? '', password: process.env.DEMO_MANAGER_PASSWORD ?? '', role: 'manager' },
  { id: process.env.DEMO_EMPLOYEE_ID ?? '', password: process.env.DEMO_EMPLOYEE_PASSWORD ?? '', role: 'employee' },
]

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number.isFinite(port) ? port : 4000,
  mongodbUri: process.env.MONGODB_URI ?? '',
  otpProvider: process.env.OTP_PROVIDER ?? '',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  demoAccounts,
  demoAuthEnabled:
    process.env.NODE_ENV !== 'production' &&
    demoAccounts.every(({ id, password }) => id && password) &&
    new Set(demoAccounts.map(({ id }) => id.toLowerCase())).size === demoAccounts.length &&
    (process.env.JWT_SECRET ?? '').length >= 32,
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
}
