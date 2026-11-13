import Employee from '../modules/employees/models/employee.model.js'

/**
 * Resolves which employees a manager/admin request may see.
 *
 * Stage 1 rule: an admin acts organization-wide; a manager acts on their direct
 * reports. Employees never reach these helpers (the route guard rejects them).
 */
export function teamScope(principal) {
  const organization = principal.organizationId
  if (principal.role === 'admin') {
    return { organization, filter: { organization, 'job.isActive': true } }
  }
  return {
    organization,
    filter: { organization, manager: principal.employeeId, 'job.isActive': true },
  }
}

export function teamEmployeeQuery(principal) {
  return Employee.find(teamScope(principal).filter)
}
