import { z } from "zod";

import {
  EMPLOYMENT_STATUSES,
  MAX_ADDRESS_LENGTH,
  MAX_BIO_LENGTH,
  MAX_DESIGNATION_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  MAX_SKILL_LENGTH,
  MAX_SKILLS,
} from "../constants/employee.js";
import { ROLES } from "../constants/roles.js";
import {
  booleanQuerySchema,
  emailSchema,
  isoDateSchema,
  objectIdSchema,
  paginationQuerySchema,
  passwordSchema,
} from "./common.js";

/**
 * Roles an organization may assign. `system_admin` is platform-level and can
 * never be created through an organization-scoped endpoint.
 */
export const assignableRoleSchema = z.enum([
  "org_admin",
  "hr_manager",
  "manager",
  "employee",
]);

const nameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH);
const phoneSchema = z.string().trim().max(MAX_PHONE_LENGTH);

/** `organizationId` is intentionally absent: it comes from the auth context. */
export const createEmployeeSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  role: assignableRoleSchema.default("employee"),
  phone: phoneSchema.default(""),
  departmentId: objectIdSchema.nullish(),
  designation: z.string().trim().max(MAX_DESIGNATION_LENGTH).default(""),
  managerId: objectIdSchema.nullish(),
  joinDate: isoDateSchema.nullish(),
});

export const updateEmployeeSchema = createEmployeeSchema
  .omit({ email: true, password: true })
  .partial()
  .extend({
    isActive: z.boolean().optional(),
    employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
  });

/**
 * Self-service profile edits. Department, designation, role, manager and
 * employment status are HR-owned and deliberately excluded.
 */
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: phoneSchema.optional(),
  address: z.string().trim().max(MAX_ADDRESS_LENGTH).optional(),
  dateOfBirth: isoDateSchema.nullish(),
  bio: z.string().trim().max(MAX_BIO_LENGTH).optional(),
  avatarFileId: objectIdSchema.nullish(),
  skills: z
    .array(z.string().trim().min(1).max(MAX_SKILL_LENGTH))
    .max(MAX_SKILLS)
    .optional(),
});

export const employeeListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  role: z.enum(ROLES).optional(),
  departmentId: objectIdSchema.optional(),
  status: z.enum(EMPLOYMENT_STATUSES).optional(),
  isActive: booleanQuerySchema.optional(),
});

export const updateEmployeeStatusSchema = z.object({
  isActive: z.boolean(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type EmployeeListQueryInput = z.infer<typeof employeeListQuerySchema>;
export type UpdateEmployeeStatusInput = z.infer<typeof updateEmployeeStatusSchema>;
