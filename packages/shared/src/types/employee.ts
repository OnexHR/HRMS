import type { ActivityType, EmploymentStatus } from '../constants/employee.js'
import type { Role } from '../constants/roles.js'
import type { EntityId, ISODateString, Nullable } from './api.js'

/**
 * Employee record as returned by the API.
 *
 * Decision 3 (locked): `organizationId` is mandatory and every read is scoped
 * to it. Passwords are never part of any shared shape. Departments are a plain
 * string in Stage 1 (donor parity); the Stage 2 org model introduces ids.
 */

export interface EmployeeJob {
  joinDate: Nullable<ISODateString>
  endDate: Nullable<ISODateString>
  status: EmploymentStatus
  isActive: boolean
}

export interface EmployeeProfile {
  bio: string
  avatarFileId: Nullable<EntityId>
  dateOfBirth: Nullable<ISODateString>
  address: string
  skills: string[]
}

export interface EmployeeSummary {
  id: EntityId
  employeeCode: string
  firstName: string
  lastName: string
  designation: string
  email?: string
  role?: Role
  department?: string
}

export interface Employee {
  id: EntityId
  organizationId: EntityId
  email: string
  role: Role
  firstName: string
  lastName: string
  phone: string
  employeeCode: string
  department: string
  designation: string
  managerId: Nullable<EntityId>
  manager: Nullable<EmployeeSummary>
  job: EmployeeJob
  profile: EmployeeProfile
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface EmployeeListQuery {
  page?: number
  pageSize?: number
  search?: string
  role?: Role
  department?: string
  status?: EmploymentStatus
  isActive?: boolean
}

export interface EmployeeStats {
  total: number
  active: number
  inactive: number
  onLeave: number
  terminated: number
  byRole: Record<Role, number>
  byDepartment: Array<{ department: string; count: number }>
}

export interface ActivityEntry {
  id: EntityId
  organizationId: EntityId
  employeeId: EntityId
  actorId: Nullable<EntityId>
  type: ActivityType
  at: ISODateString
  meta: Record<string, unknown>
}
