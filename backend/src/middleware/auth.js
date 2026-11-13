import { ApiError } from '../lib/api-error.js'
import { verifyAccessToken } from '../lib/jwt.js'
import Employee from '../modules/employees/models/employee.model.js'

function bearerToken(req) {
  const header = req.get('authorization') ?? ''
  const [scheme, token] = header.split(' ')
  if (!token || scheme.toLowerCase() !== 'bearer') return null
  return token
}

/**
 * Resolves the single HRMS identity from the bearer token.
 *
 * The token is only a hint: the employee is reloaded from the database and must
 * still belong to the token's organization and be active. This makes
 * deactivation and tenant moves take effect immediately.
 */
export async function authenticate(req, _res, next) {
  try {
    const token = bearerToken(req)
    if (!token) throw ApiError.unauthenticated('Access denied. No token provided.')

    let decoded
    try {
      decoded = verifyAccessToken(token)
    } catch {
      throw ApiError.unauthenticated('Invalid or expired token.')
    }

    if (!decoded?.sub || !decoded?.org) {
      throw ApiError.unauthenticated('Invalid token.')
    }

    const employee = await Employee.findOne({
      _id: decoded.sub,
      organization: decoded.org,
    })
    if (!employee || !employee.job?.isActive) {
      throw ApiError.unauthenticated('Account is inactive or no longer exists.')
    }

    req.principal = {
      employeeId: String(employee._id),
      organizationId: String(employee.organization),
      role: employee.role,
    }
    req.employee = employee
    next()
  } catch (error) {
    next(error)
  }
}

/** Route guard for the Stage 1 role model. */
export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.principal) {
      return next(ApiError.unauthenticated())
    }
    if (roles.length && !roles.includes(req.principal.role)) {
      return next(ApiError.forbidden('Your role cannot access this resource.'))
    }
    next()
  }
}

export const requireAdmin = authorize('admin')
export const requireManager = authorize('manager', 'admin')
