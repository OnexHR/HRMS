import bcrypt from 'bcrypt'
import { MAX_PASSWORD_BYTES, truncateUtf8 } from '@hrms/shared'

import { env } from '../config/env.js'

/**
 * bcrypt only consumes the first 72 UTF-8 bytes. New passwords are validated to
 * fit, but legacy donor hashes may have been produced from longer input, so
 * every path truncates explicitly before hashing or comparing.
 */
export function effectivePassword(value) {
  return truncateUtf8(typeof value === 'string' ? value : '', MAX_PASSWORD_BYTES)
}

export function hashPassword(value) {
  return bcrypt.hash(effectivePassword(value), env.bcryptRounds)
}

export function comparePassword(candidate, hash) {
  if (!hash) return Promise.resolve(false)
  return bcrypt.compare(effectivePassword(candidate), hash)
}
