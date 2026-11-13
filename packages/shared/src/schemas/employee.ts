import { z } from 'zod'

import {
  EMPLOYMENT_STATUSES,
  MAX_ADDRESS_LENGTH,
  MAX_BIO_LENGTH,
  MAX_DEPARTMENT_LENGTH,
  MAX_DESIGNATION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_SKILL_LENGTH,
  MAX_SKILLS,
} from '../constants/employee.js'
import { ASSIGNABLE_ROLES, ROLES } from '../constants/roles.js'
import {
  booleanQuerySchema,
  emailSchema,
  isoDateSchema,
  objectIdSchema,
  paginationQuerySchema,
  passwordSchema,
} from './common.js'

/**
 * Roles an administrator may assign through the employee API. `admin` is
 * provisioned by the seed process and is deliberately not assignable here.
 */
export const assignableRoleSchema = z.enum(ASSIGNABLE_ROLES)

const nameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH)
const phoneSchema = z.string().trim().max(MAX_PHONE_LENGTH)
const departmentSchema = z.string().trim().max(MAX_DEPARTMENT_LENGTH)
const designationSchema = z.string().trim().max(MAX_DESIGNATION_LENGTH)

/**
 * Create schema.
 *
 * `organizationId` is intentionally absent: it comes from the auth context.
 * `department` is a plain string in Stage 1 (donor parity).
 */
export const createEmployeeSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    firstName: nameSchema,
    lastName: nameSchema,
    role: assignableRoleSchema.default('employee'),
    phone: phoneSchema.default(''),
    department: departmentSchema.default(''),
    designation: designationSchema.default(''),
    managerId: objectIdSchema.nullish(),
    joinDate: isoDateSchema.nullish(),
  })
  .strict()

/**
 * Update schema (C1).
 *
 * Every field is optional and **none** carries a default. Zod's `.partial()`
 * preserves defaults, so deriving this schema from `createEmployeeSchema`
 * would inject `role`, `phone`, `department`, and `designation` into a PATCH
 * that only supplied `firstName`. The fields below are declared independently
 * so `updateEmployeeSchema.parse({ firstName })` returns exactly one key.
 */
export const updateEmployeeSchema = z
  .object({
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    role: assignableRoleSchema.optional(),
    phone: phoneSchema.optional(),
    department: departmentSchema.optional(),
    designation: designationSchema.optional(),
    managerId: objectIdSchema.nullish(),
    joinDate: isoDateSchema.nullish(),
    isActive: z.boolean().optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  })
  .strict()

/**
 * Self-service profile edits. Department, designation, role, manager and
 * employment status are HR-owned and deliberately excluded.
 */
export const updateProfileSchema = z
  .object({
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema.optional(),
    address: z.string().trim().max(MAX_ADDRESS_LENGTH).optional(),
    dateOfBirth: isoDateSchema.nullish(),
    bio: z.string().trim().max(MAX_BIO_LENGTH).optional(),
    avatarFileId: objectIdSchema.nullish(),
    skills: z.array(z.string().trim().min(1).max(MAX_SKILL_LENGTH)).max(MAX_SKILLS).optional(),
  })
  .strict()

export const employeeListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  role: z.enum(ROLES).optional(),
  department: departmentSchema.optional(),
  status: z.enum(EMPLOYMENT_STATUSES).optional(),
  isActive: booleanQuerySchema.optional(),
})

export const updateEmployeeStatusSchema = z
  .object({
    isActive: z.boolean(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  })
  .strict()

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type EmployeeListQueryInput = z.infer<typeof employeeListQuerySchema>
export type UpdateEmployeeStatusInput = z.infer<typeof updateEmployeeStatusSchema>
