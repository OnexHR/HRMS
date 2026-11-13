import { sendCreated, sendData } from '../../../lib/response.js'
import { balanceView } from '../../leave/services/leave.service.js'
import {
  adminStats,
  addTeamMember,
  createEmployee,
  deactivateEmployee,
  getEmployeeDetail,
  getTeamMemberDetail,
  listAvailableEmployees,
  listEmployees,
  listManagers,
  listTeamMembers,
  loadEmployee,
  removeTeamMember,
  updateEmployee,
  updateEmployeeStatus,
  updateOwnProfile,
} from '../services/employee.service.js'
import { sanitizeEmployee } from '../models/employee.model.js'

export async function handleCreateEmployee(req, res) {
  const employee = await createEmployee({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    body: req.body ?? {},
  })
  return sendCreated(res, { employee })
}

export async function handleListEmployees(req, res) {
  const result = await listEmployees(req.principal.organizationId, req.query)
  return sendData(res, {
    employees: result.employees,
    total: result.total,
    page: result.page,
    limit: result.pageSize,
    pageSize: result.pageSize,
    totalPages: result.pageSize ? Math.ceil(result.total / result.pageSize) : 0,
  })
}

export async function handleGetEmployee(req, res) {
  const result = await getEmployeeDetail(req.principal.organizationId, req.params.id)
  return sendData(res, result)
}

export async function handleUpdateEmployee(req, res) {
  const employee = await updateEmployee({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    id: req.params.id,
    body: req.body ?? {},
  })
  return sendData(res, { employee })
}

export async function handleDeleteEmployee(req, res) {
  const result = await deactivateEmployee({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    id: req.params.id,
  })
  return sendData(res, { message: 'Employee deactivated.', ...result })
}

export async function handleUpdateEmployeeStatus(req, res) {
  const employee = await updateEmployeeStatus({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    id: req.params.id,
    body: req.body ?? {},
  })
  return sendData(res, { employee })
}

export async function handleAdminStats(req, res) {
  return sendData(res, await adminStats(req.principal.organizationId))
}

export async function handleListManagers(req, res) {
  const managers = await listManagers(req.principal.organizationId)
  return sendData(res, { managers })
}

export async function handleListAvailableEmployees(req, res) {
  const employees = await listAvailableEmployees(
    req.principal.organizationId,
    typeof req.query.search === 'string' ? req.query.search : '',
  )
  return sendData(res, { employees })
}

export async function handleTeamMembers(req, res) {
  const members = await listTeamMembers({
    organizationId: req.principal.organizationId,
    principal: req.principal,
  })
  return sendData(res, { members })
}

export async function handleTeamMemberDetail(req, res) {
  const result = await getTeamMemberDetail({
    organizationId: req.principal.organizationId,
    principal: req.principal,
    memberId: req.params.id,
    date: req.query.date || new Date(),
  })
  return sendData(res, result)
}

export async function handleTeamCreateEmployee(req, res) {
  const employee = await createEmployee({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    body: req.body ?? {},
    asManager: req.principal.role === 'manager',
  })
  return sendCreated(res, { employee })
}

export async function handleAddTeamMember(req, res) {
  const member = await addTeamMember({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    employeeId: req.body?.employeeId,
    managerId: req.body?.managerId,
  })
  return sendData(res, { member })
}

export async function handleRemoveTeamMember(req, res) {
  const member = await removeTeamMember({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    id: req.params.id,
  })
  return sendData(res, { member })
}

export async function handleGetMe(req, res) {
  const employee = await loadEmployee(req.principal.organizationId, req.principal.employeeId)
  return sendData(res, {
    employee: sanitizeEmployee(employee),
    leaveBalance: balanceView(employee),
  })
}

export async function handleUpdateMe(req, res) {
  const employee = await updateOwnProfile({
    organizationId: req.principal.organizationId,
    employee: req.employee,
    body: req.body ?? {},
  })
  return sendData(res, { employee })
}
