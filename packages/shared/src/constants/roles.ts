/**
 * Stage 1 role vocabulary and permission matrix.
 *
 * Stage 1 has exactly three roles: `admin`, `manager`, `employee`. The
 * enterprise five-role matrix (`system_admin`, `org_admin`, `hr_manager`, ...)
 * is a Stage 2 concern and deliberately does not appear in code yet.
 *
 * The permission list is the shared vocabulary for both sides. The backend is
 * the authority; the frontend uses it only to hide or disable UI.
 */

export const ROLES = ['admin', 'manager', 'employee'] as const

export type Role = (typeof ROLES)[number]

/** Role assigned when none is supplied. */
export const DEFAULT_ROLE: Role = 'employee'

/**
 * Roles an administrator may assign through the employee API.
 *
 * `admin` is provisioned by the seed process, never by an employee endpoint, so
 * it is intentionally excluded from request payloads.
 */
export const ASSIGNABLE_ROLES = ['manager', 'employee'] as const

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  employee: 'Employee',
}

/**
 * Coarse authority ranking, highest first. Use for "at least this role" checks
 * only; per-action authority always goes through `hasPermission`.
 */
export const ROLE_RANK: Record<Role, number> = {
  admin: 30,
  manager: 20,
  employee: 10,
}

/** Read visibility resolved from a role (H2). */
export const READ_SCOPES = ['self', 'team', 'all'] as const

export type ReadScope = (typeof READ_SCOPES)[number]

export const PERMISSIONS = [
  // Self-service
  'employee:read:self',
  'employee:update:self',
  'attendance:read:self',
  'attendance:write:self',
  'leave:read:self',
  'leave:request',
  'task:read:self',
  'task:update:self',
  'query:create',
  'query:read:self',
  'meeting:create',
  'meeting:read:self',
  'file:upload',
  'file:read',
  'file:delete',
  // Team scope (manager and admin)
  'employee:read:team',
  'team:manage',
  'attendance:read:team',
  'leave:review:team',
  'task:assign',
  'task:read:team',
  'query:read:team',
  'query:review',
  'report:read:team',
  // Organization scope (admin)
  'employee:read:all',
  'employee:create',
  'employee:update',
  'employee:deactivate',
  'attendance:read:all',
  'leave:review:all',
  'report:read:all',
  'settings:manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const SELF_PERMISSIONS: readonly Permission[] = [
  'employee:read:self',
  'employee:update:self',
  'attendance:read:self',
  'attendance:write:self',
  'leave:read:self',
  'leave:request',
  'task:read:self',
  'task:update:self',
  'query:create',
  'query:read:self',
  'meeting:create',
  'meeting:read:self',
  'file:upload',
  'file:read',
  'file:delete',
]

const MANAGER_PERMISSIONS: readonly Permission[] = [
  'employee:read:team',
  'team:manage',
  'attendance:read:team',
  'leave:review:team',
  'task:assign',
  'task:read:team',
  'query:read:team',
  'query:review',
  'report:read:team',
]

/**
 * Stage 1 permission matrix. It is additive: every role keeps the capabilities
 * of the roles below it. `admin` receives the full list, including the scoped
 * `employee:read:*` permissions, so any scope check succeeds for an admin.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  employee: SELF_PERMISSIONS,
  manager: [...SELF_PERMISSIONS, ...MANAGER_PERMISSIONS],
  admin: PERMISSIONS,
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** True when `role` ranks at or above `minimum`. */
export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

/**
 * Role-assignment ceiling (H1).
 *
 * - An admin may assign any Stage 1 role.
 * - A manager may only assign `employee`.
 * - An employee may assign nothing.
 * - Nobody may change their own role, even an admin.
 */
export function canAssignRole(actorRole: Role, targetRole: Role, isSelf = false): boolean {
  if (isSelf) return false
  if (actorRole === 'admin') return true
  if (actorRole === 'manager') return targetRole === 'employee'
  return false
}

/** Read visibility implied by a role (H2). */
export function resolveReadScope(role: Role): ReadScope {
  if (role === 'admin') return 'all'
  if (role === 'manager') return 'team'
  return 'self'
}
