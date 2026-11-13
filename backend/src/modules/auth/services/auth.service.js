import { ApiError } from '../../../lib/api-error.js'
import { signAccessToken } from '../../../lib/jwt.js'
import { comparePassword } from '../../../lib/password.js'
import Employee, { sanitizeEmployee } from '../../employees/models/employee.model.js'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const attempts = new Map()

function throttleKey(organizationId, email) {
  return `${organizationId}:${String(email).toLowerCase()}`
}

function checkThrottle(key) {
  const record = attempts.get(key)
  if (!record) return null
  const now = Date.now()
  if (now - record.last > WINDOW_MS) {
    attempts.delete(key)
    return null
  }
  if (record.count >= MAX_ATTEMPTS) {
    return { retryAfter: Math.ceil((record.last + WINDOW_MS - now) / 1000) }
  }
  return null
}

function recordAttempt(key, success) {
  const now = Date.now()
  const record = attempts.get(key) ?? { count: 0, last: now }
  record.count = success ? 0 : record.count + 1
  record.last = now
  attempts.set(key, record)
}

export function resetLoginThrottle() {
  attempts.clear()
}

export function sessionPayload(employee, token) {
  return {
    token,
    role: employee.role,
    isManager: employee.role === 'manager',
    isAdmin: employee.role === 'admin',
    employee: sanitizeEmployee(employee),
  }
}

/**
 * Authenticates an employee of one organization. When `requiredRole` is set
 * (the compatibility admin-login route), a non-admin is rejected with the same
 * generic message so the endpoint does not disclose account roles.
 */
export async function loginWithPassword({ organizationId, email, password, requiredRole }) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase()
  if (!normalizedEmail || typeof password !== 'string' || !password) {
    throw ApiError.validation('Email and password are required.')
  }

  const key = throttleKey(organizationId, normalizedEmail)
  const limited = checkThrottle(key)
  if (limited) {
    throw ApiError.rateLimited(`Too many attempts. Retry in ${limited.retryAfter}s.`, {
      retryAfter: limited.retryAfter,
    })
  }

  const employee = await Employee.findOne({
    organization: organizationId,
    email: normalizedEmail,
  }).select('+password')

  if (
    !employee ||
    !employee.job?.isActive ||
    (requiredRole && employee.role !== requiredRole) ||
    !(await employee.comparePassword(password))
  ) {
    recordAttempt(key, false)
    throw ApiError.unauthenticated('Invalid email or password.')
  }

  recordAttempt(key, true)
  return sessionPayload(employee, signAccessToken(employee))
}

export async function changeOwnPassword(employeeId, organizationId, currentPassword, newPassword) {
  const employee = await Employee.findOne({ _id: employeeId, organization: organizationId }).select(
    '+password',
  )
  if (!employee) throw ApiError.notFound('Account not found.')

  if (!(await employee.comparePassword(currentPassword))) {
    throw ApiError.validation('Current password is incorrect.')
  }

  employee.password = newPassword
  await employee.save()
  return true
}

export { sanitizeEmployee }
