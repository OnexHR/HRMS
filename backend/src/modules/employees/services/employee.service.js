import { canAssignRole } from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { logActivity } from './activity.service.js'
import Employee, { sanitizeEmployee } from '../models/employee.model.js'
import Attendance from '../../attendance/models/attendance.model.js'
import LeaveRequest from '../../leave/models/leave-request.model.js'
import { serializeLeaveRequest } from '../../leave/services/leave.service.js'
import { monthlyAttendance } from '../../attendance/services/attendance.service.js'
import Task from '../../tasks/models/task.model.js'
import { buildManagerEmployeePayload, validateEmployeeCreate, validateEmployeeUpdate } from '../validators/employee.validator.js'

const MANAGER_FIELDS = 'firstName lastName employeeCode'
const LIST_PROJECTION =
  'firstName lastName employeeCode email phone department designation role manager job profile avatarFileId'

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function assertManager(manager, organizationId) {
  return Employee.findOne({
    _id: manager,
    organization: organizationId,
    role: 'manager',
    'job.isActive': true,
  }).lean()
}

export async function listEmployees(organizationId, query = {}) {
  const { department, role, status, manager, search } = query
  const filter = { organization: organizationId }

  if (department) filter.department = department
  if (role) filter.role = role
  if (status) filter['job.status'] = status
  if (manager) filter.manager = manager
  if (query.isActive !== undefined) filter['job.isActive'] = query.isActive === 'true'
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [
      { firstName: rx },
      { lastName: rx },
      { email: rx },
      { employeeCode: rx },
      { department: rx },
    ]
  }

  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? query.limit) || 20))

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .select(LIST_PROJECTION)
      .populate('manager', MANAGER_FIELDS)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Employee.countDocuments(filter),
  ])

  return { employees, total, page, pageSize }
}

export async function loadEmployee(organizationId, id) {
  const employee = await Employee.findOne({ _id: id, organization: organizationId })
    .select('-password')
    .populate('manager', MANAGER_FIELDS)
  if (!employee) throw ApiError.notFound('Employee not found.')
  return employee
}

export async function getEmployeeDetail(organizationId, id) {
  const employee = await loadEmployee(organizationId, id)

  const [tasksCompleted, totalLeaves, attendanceDays] = await Promise.all([
    Task.countDocuments({ organization: organizationId, assignedTo: employee._id, status: 'Completed' }),
    LeaveRequest.countDocuments({ organization: organizationId, employee: employee._id }),
    Attendance.countDocuments({ organization: organizationId, employee: employee._id }),
  ])

  return {
    employee: sanitizeEmployee(employee),
    stats: {
      tasksCompleted,
      totalLeaves,
      attendanceDays,
      leaveBalance: employee.leaveBalances,
    },
  }
}

export async function createEmployee({ organizationId, actor, body, asManager = false }) {
  const payload = asManager
    ? buildManagerEmployeePayload(body, actor.employeeId)
    : validateEmployeeCreate(body)

  if (payload.role === 'manager') payload.manager = null

  if (payload.manager) {
    const manager = await assertManager(payload.manager, organizationId)
    if (!manager) throw ApiError.validation('Assigned manager must be an existing manager.')
  }

  if (!canAssignRole(actor.role, payload.role)) {
    throw ApiError.forbidden('You cannot assign this role.')
  }

  const employee = await Employee.create({ ...payload, organization: organizationId })
  await logActivity(organizationId, employee._id, 'employee_created', { by: actor.employeeId })

  return sanitizeEmployee(await loadEmployee(organizationId, employee._id))
}

export async function updateEmployee({ organizationId, actor, id, body }) {
  const employee = await Employee.findOne({ _id: id, organization: organizationId })
  if (!employee) throw ApiError.notFound('Employee not found.')

  const payload = validateEmployeeUpdate(body, employee.job?.joinDate)

  if (payload.role && !canAssignRole(actor.role, payload.role, String(employee._id) === actor.employeeId)) {
    throw ApiError.forbidden('You cannot assign this role.')
  }

  if (payload.manager) {
    if (String(payload.manager) === String(employee._id)) {
      throw ApiError.validation('An employee cannot be their own manager.')
    }
    const manager = await assertManager(payload.manager, organizationId)
    if (!manager) throw ApiError.validation('Assigned manager must be an existing manager.')
  }

  if (payload.role === 'manager') payload.manager = null

  const fields = {
    email: 'email',
    password: 'password',
    role: 'role',
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phone',
    department: 'department',
    designation: 'designation',
    manager: 'manager',
    joinDate: 'job.joinDate',
    status: 'job.status',
    isActive: 'job.isActive',
    dateOfBirth: 'personal.dateOfBirth',
    gender: 'personal.gender',
    address: 'personal.address',
    emergencyContact: 'personal.emergencyContact',
    bio: 'profile.bio',
    avatarFileId: 'profile.avatarFileId',
    skills: 'profile.skills',
    dob: 'profile.dob',
    endDate: 'job.endDate',
  }

  for (const [source, destination] of Object.entries(fields)) {
    if (payload[source] !== undefined) employee.set(destination, payload[source])
  }

  await employee.save()
  await logActivity(organizationId, employee._id, 'employee_updated', { by: actor.employeeId })

  return sanitizeEmployee(await loadEmployee(organizationId, employee._id))
}

export async function deactivateEmployee({ organizationId, actor, id }) {
  const employee = await Employee.findOne({ _id: id, organization: organizationId })
  if (!employee) throw ApiError.notFound('Employee not found.')
  if (String(employee._id) === actor.employeeId) {
    throw ApiError.validation('You cannot deactivate your own account.')
  }

  employee.job.isActive = false
  employee.job.status = 'inactive'
  await employee.save()

  const detached = await Employee.updateMany(
    { organization: organizationId, manager: employee._id },
    { $set: { manager: null } },
  )

  await logActivity(organizationId, employee._id, 'employee_deactivated', {
    by: actor.employeeId,
  })

  return { detachedReports: detached.modifiedCount }
}

export async function updateEmployeeStatus({ organizationId, actor, id, body }) {
  const employee = await Employee.findOne({ _id: id, organization: organizationId })
  if (!employee) throw ApiError.notFound('Employee not found.')
  if (String(employee._id) === actor.employeeId && body?.isActive === false) {
    throw ApiError.validation('You cannot deactivate your own account.')
  }

  const isActive =
    typeof body?.isActive === 'boolean' ? body.isActive : !employee.job.isActive
  employee.job.isActive = isActive
  employee.job.status = isActive ? 'active' : 'inactive'
  await employee.save()

  return sanitizeEmployee(await loadEmployee(organizationId, employee._id))
}

export async function adminStats(organizationId) {
  const match = { organization: organizationId }
  const [total, byRole, byDepartment, byStatus] = await Promise.all([
    Employee.countDocuments(match),
    Employee.aggregate([{ $match: match }, { $group: { _id: '$role', count: { $sum: 1 } } }]),
    Employee.aggregate([
      { $match: { ...match, department: { $ne: '' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Employee.aggregate([
      { $match: match },
      { $group: { _id: '$job.status', count: { $sum: 1 } } },
    ]),
  ])

  const reduce = (rows) => Object.fromEntries(rows.map((row) => [row._id || 'other', row.count]))

  return {
    total,
    byRole: reduce(byRole),
    byDepartment: byDepartment.map((row) => ({ department: row._id, count: row.count })),
    byStatus: reduce(byStatus),
  }
}

const TEAM_MEMBER_PROJECTION =
  'firstName lastName employeeCode department designation role manager job profile'

/** Active direct reports for a manager; org-wide membership for an admin. */
export async function listTeamMembers({ organizationId, principal }) {
  const filter = {
    organization: organizationId,
    'job.isActive': true,
    ...(principal.role === 'admin' ? {} : { manager: principal.employeeId }),
  }

  return Employee.find(filter)
    .select(TEAM_MEMBER_PROJECTION)
    .populate('manager', 'firstName lastName employeeCode')
    .sort({ firstName: 1 })
    .lean()
}

export async function getTeamMemberDetail({ organizationId, principal, memberId, date }) {
  const filter = {
    _id: memberId,
    organization: organizationId,
    'job.isActive': true,
    ...(principal.role === 'admin' ? {} : { manager: principal.employeeId }),
  }

  const member = await Employee.findOne(filter)
    .select('-password')
    .populate('manager', 'firstName lastName employeeCode')
  if (!member) throw ApiError.notFound('Team member not found.')

  const [attendanceMonth, pendingLeaves] = await Promise.all([
    monthlyAttendance(organizationId, member._id, date),
    LeaveRequest.find({
      organization: organizationId,
      employee: member._id,
      status: 'pending',
    })
      .sort({ fromDate: 1 })
      .lean(),
  ])

  return {
    member: sanitizeEmployee(member),
    attendanceMonth,
    pendingLeaves: pendingLeaves.map(serializeLeaveRequest),
  }
}

export async function listManagers(organizationId) {
  return Employee.find({
    organization: organizationId,
    role: 'manager',
    'job.isActive': true,
  })
    .select('firstName lastName employeeCode department designation')
    .sort({ firstName: 1 })
    .lean()
}

export async function listAvailableEmployees(organizationId, search) {
  const filter = { organization: organizationId, 'job.isActive': true }
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [
      { firstName: rx },
      { lastName: rx },
      { employeeCode: rx },
      { department: rx },
    ]
  }

  const employees = await Employee.find(filter)
    .select('firstName lastName employeeCode department designation')
    .sort({ firstName: 1 })
    .lean()

  return employees.map((employee) => ({
    _id: employee._id,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    employeeCode: employee.employeeCode,
    department: employee.department,
    designation: employee.designation,
  }))
}

export async function addTeamMember({ organizationId, actor, employeeId, managerId }) {
  const employee = await Employee.findOne({ _id: employeeId, organization: organizationId })
  if (!employee) throw ApiError.notFound('Employee not found.')

  const targetManagerId = actor.role === 'admin' ? managerId : actor.employeeId
  if (!targetManagerId) {
    throw ApiError.validation('managerId is required when an admin assigns team membership.')
  }
  if (String(employee._id) === String(targetManagerId)) {
    throw ApiError.validation('You cannot add yourself to your own team.')
  }
  const manager = await assertManager(targetManagerId, organizationId)
  if (!manager) throw ApiError.validation('Assigned manager must be an existing manager.')
  if (String(employee.manager) === String(targetManagerId)) {
    throw ApiError.conflict('This employee is already on that team.')
  }

  employee.manager = targetManagerId
  await employee.save()
  await logActivity(organizationId, employee._id, 'employee_updated', { by: actor.employeeId })

  return {
    _id: employee._id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeCode: employee.employeeCode,
    department: employee.department,
    designation: employee.designation,
    role: employee.role,
    job: { joinDate: employee.job?.joinDate ?? null },
  }
}

export async function removeTeamMember({ organizationId, actor, id }) {
  const employee = await Employee.findOne({ _id: id, organization: organizationId })
  if (!employee) throw ApiError.notFound('Employee not found.')

  const expectedManager = actor.role === 'admin' ? employee.manager : actor.employeeId
  if (!expectedManager || String(employee.manager) !== String(expectedManager)) {
    throw ApiError.validation('This employee is not on that team.')
  }

  employee.manager = null
  await employee.save()
  await logActivity(organizationId, employee._id, 'employee_updated', {
    removedFromManager: String(expectedManager),
  })

  return {
    _id: employee._id,
    firstName: employee.firstName,
    lastName: employee.lastName,
    employeeCode: employee.employeeCode,
    department: employee.department,
    designation: employee.designation,
    role: employee.role,
  }
}

export async function updateOwnProfile({ organizationId, employee, body }) {
  const payload = validateEmployeeUpdate(body, employee.job?.joinDate)

  const allowed = [
    'firstName',
    'lastName',
    'phone',
    'dateOfBirth',
    'gender',
    'address',
    'emergencyContact',
    'bio',
    'avatarFileId',
    'skills',
    'dob',
    'endDate',
  ]

  const fields = {
    firstName: 'firstName',
    lastName: 'lastName',
    phone: 'phone',
    dateOfBirth: 'personal.dateOfBirth',
    gender: 'personal.gender',
    address: 'personal.address',
    emergencyContact: 'personal.emergencyContact',
    bio: 'profile.bio',
    avatarFileId: 'profile.avatarFileId',
    skills: 'profile.skills',
    dob: 'profile.dob',
    endDate: 'job.endDate',
  }

  const changed = []
  for (const [source, destination] of Object.entries(fields)) {
    if (!allowed.includes(source)) continue
    if (payload[source] === undefined) continue
    employee.set(destination, payload[source])
    changed.push(source)
  }

  await employee.save()
  if (changed.length) {
    await logActivity(organizationId, employee._id, 'profile_updated', { fields: changed })
  }

  return sanitizeEmployee(await loadEmployee(organizationId, employee._id))
}
