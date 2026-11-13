/**
 * Five-role RBAC vocabulary.
 *
 * Decision 2 (locked): `system_admin`, `org_admin`, `hr_manager`, `manager`,
 * `employee`. Decision 9 (locked): managers see their own team, while
 * `hr_manager` and `org_admin` see organization-level data.
 *
 * The permission list is the shared vocabulary for both sides. The backend is
 * still the authority; the frontend uses it only to hide/disable UI.
 */

export const ROLES = [
  "system_admin",
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
] as const;

export type Role = (typeof ROLES)[number];

/** Role assigned when none is supplied. */
export const DEFAULT_ROLE: Role = "employee";

export const ROLE_LABELS: Record<Role, string> = {
  system_admin: "System Administrator",
  org_admin: "Organization Administrator",
  hr_manager: "HR Manager",
  manager: "Manager",
  employee: "Employee",
};

/**
 * Coarse authority ranking, highest first. Use for "at least this role" checks
 * only; per-action authority always goes through `hasPermission`.
 */
export const ROLE_RANK: Record<Role, number> = {
  system_admin: 50,
  org_admin: 40,
  hr_manager: 30,
  manager: 20,
  employee: 10,
};

export const PERMISSIONS = [
  "system:manage",
  "organization:read",
  "organization:update",
  "settings:read",
  "settings:update",
  "employee:read",
  "employee:create",
  "employee:update",
  "employee:delete",
  "employee:read:self",
  "employee:update:self",
  "attendance:read:self",
  "attendance:write:self",
  "attendance:read:team",
  "attendance:read:org",
  "leave:read:self",
  "leave:request",
  "leave:review:team",
  "leave:review:org",
  "leave:adjust",
  "task:read:self",
  "task:update:self",
  "task:assign",
  "task:read:team",
  "query:create",
  "query:read:self",
  "query:read:team",
  "query:review",
  "meeting:create",
  "meeting:read:self",
  "report:read:team",
  "report:read:org",
  "file:upload",
  "file:read",
  "file:delete",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const SELF_PERMISSIONS: readonly Permission[] = [
  "employee:read:self",
  "employee:update:self",
  "attendance:read:self",
  "attendance:write:self",
  "leave:read:self",
  "leave:request",
  "task:read:self",
  "task:update:self",
  "query:create",
  "query:read:self",
  "meeting:create",
  "meeting:read:self",
  "file:upload",
  "file:read",
  "file:delete",
];

const MANAGER_PERMISSIONS: readonly Permission[] = [
  "employee:read",
  "attendance:read:team",
  "leave:review:team",
  "task:assign",
  "task:read:team",
  "query:read:team",
  "query:review",
  "report:read:team",
];

const HR_MANAGER_PERMISSIONS: readonly Permission[] = [
  "employee:create",
  "employee:update",
  "attendance:read:org",
  "leave:review:org",
  "leave:adjust",
  "report:read:org",
  "settings:read",
];

const ORG_ADMIN_PERMISSIONS: readonly Permission[] = [
  "organization:read",
  "organization:update",
  "employee:delete",
  "settings:update",
];

/**
 * Baseline permission matrix. Deliberately additive so a role always keeps the
 * capabilities of the roles below it.
 *
 * `system_admin` is the only role with `system:manage`; `org_admin` is the only
 * org-scoped role that may hard-delete employees. Full account deletion of an
 * organization is a system-admin action.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  employee: SELF_PERMISSIONS,
  manager: [...SELF_PERMISSIONS, ...MANAGER_PERMISSIONS],
  hr_manager: [
    ...SELF_PERMISSIONS,
    ...MANAGER_PERMISSIONS,
    ...HR_MANAGER_PERMISSIONS,
  ],
  org_admin: [
    ...SELF_PERMISSIONS,
    ...MANAGER_PERMISSIONS,
    ...HR_MANAGER_PERMISSIONS,
    ...ORG_ADMIN_PERMISSIONS,
  ],
  system_admin: PERMISSIONS,
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** True when `role` ranks at or above `minimum`. */
export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
