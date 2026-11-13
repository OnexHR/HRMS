import type { Role } from '../constants/roles.js'
import type { EntityId } from './api.js'
import type { Employee } from './employee.js'

/**
 * Authenticated identity attached to a request by the backend.
 *
 * Decision 3 (locked): one JWT realm and one Employee identity. The tenant id
 * is resolved from the singleton organization in Stage 1 and becomes
 * request-derived in Stage 2.
 */
export interface AuthPrincipal {
  employeeId: EntityId
  organizationId: EntityId
  role: Role
}

/** Login payload: the signed token plus the authenticated employee. */
export interface AuthSession {
  token: string
  principal: AuthPrincipal
  employee: Employee
}

/** `GET /auth/me` payload: the session without a new token. */
export interface AuthProfile {
  principal: AuthPrincipal
  employee: Employee
}
