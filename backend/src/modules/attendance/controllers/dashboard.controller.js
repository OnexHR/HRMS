import { parseDate } from '../../../lib/dates.js'
import { sendData } from '../../../lib/response.js'
import { employeeDashboard, managerDashboard } from '../services/dashboard.service.js'

function requestedDate(value) {
  if (!value) return new Date()
  return parseDate(value) ?? new Date()
}

export async function handleEmployeeDashboard(req, res) {
  const data = await employeeDashboard({
    organizationId: req.principal.organizationId,
    employee: req.employee,
    date: requestedDate(req.query.date),
  })
  return sendData(res, data)
}

export async function handleManagerDashboard(req, res) {
  const data = await managerDashboard({
    organizationId: req.principal.organizationId,
    principal: req.principal,
    date: requestedDate(req.query.date),
  })
  return sendData(res, data)
}
