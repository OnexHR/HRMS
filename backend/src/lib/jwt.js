import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'

/**
 * Single JWT realm. Every identity is an Employee; `role` is one of the Stage 1
 * roles. The organization is embedded so a token can never be replayed against
 * another tenant's records.
 */
export function signAccessToken(employee) {
  return jwt.sign(
    {
      sub: String(employee._id),
      org: String(employee.organization),
      role: employee.role,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret)
}
