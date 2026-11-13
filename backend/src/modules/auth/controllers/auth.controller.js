import { changePasswordSchema, loginSchema } from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { sendData } from '../../../lib/response.js'
import { parseWith } from '../../../middleware/validate.js'
import { ensureOrganization } from '../../organizations/services/organization.service.js'
import {
  changeOwnPassword,
  loginWithPassword,
  sanitizeEmployee,
} from '../services/auth.service.js'

async function login(req, res, requiredRole) {
  const payload = parseWith(loginSchema, req.body ?? {}, 'Invalid login payload.')
  const organization = await ensureOrganization()

  const session = await loginWithPassword({
    organizationId: organization._id,
    email: payload.email,
    password: payload.password,
    requiredRole,
  })

  return sendData(res, session)
}

export async function handleLogin(req, res) {
  return login(req, res)
}

/**
 * Compatibility alias for the donor admin realm. It authenticates the same
 * Employee identity and only succeeds for `role = admin`.
 */
export async function handleAdminLogin(req, res) {
  return login(req, res, 'admin')
}

export function handleMe(req, res) {
  return sendData(res, {
    employee: sanitizeEmployee(req.employee),
    role: req.principal.role,
    isAdmin: req.principal.role === 'admin',
    isManager: req.principal.role === 'manager',
  })
}

export async function handleChangePassword(req, res) {
  const payload = parseWith(
    changePasswordSchema,
    req.body ?? {},
    'Invalid change-password payload.',
  )

  if (!req.principal) throw ApiError.unauthenticated()

  await changeOwnPassword(
    req.principal.employeeId,
    req.principal.organizationId,
    payload.currentPassword,
    payload.newPassword,
  )

  return sendData(res, { message: 'Password updated.' })
}
