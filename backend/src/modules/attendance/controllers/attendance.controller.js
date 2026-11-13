import { attendanceRangeQuerySchema } from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { parseDate, startOfDay } from '../../../lib/dates.js'
import { sendData } from '../../../lib/response.js'
import { parseWith } from '../../../middleware/validate.js'
import { attendanceTodayFor } from '../services/dashboard.service.js'
import {
  breakEnd,
  breakStart,
  checkIn,
  checkOut,
  monthlyAttendance,
  summaryForRange,
  teamAttendanceMonth,
  teamAttendanceRows,
  teamAttendanceStats,
  teamAttendanceToday,
  teamMonthlyReports,
} from '../services/attendance.service.js'

function scopeFor(principal) {
  return {
    organizationId: principal.organizationId,
    managerId: principal.role === 'admin' ? null : principal.employeeId,
  }
}

function requestedDate(value) {
  if (!value) return new Date()
  const date = parseDate(value)
  if (!date) throw ApiError.validation('date must be a valid date.')
  return date
}

export async function handleCheckIn(req, res) {
  const record = await checkIn(req.principal.organizationId, req.principal.employeeId)
  return sendData(res, { attendance: record })
}

export async function handleCheckOut(req, res) {
  const record = await checkOut(req.principal.organizationId, req.principal.employeeId)
  return sendData(res, { attendance: record })
}

export async function handleBreakStart(req, res) {
  const record = await breakStart(req.principal.organizationId, req.principal.employeeId)
  return sendData(res, { attendance: record })
}

export async function handleBreakEnd(req, res) {
  const record = await breakEnd(req.principal.organizationId, req.principal.employeeId)
  return sendData(res, { attendance: record })
}

export async function handleMyAttendanceToday(req, res) {
  const attendance = await attendanceTodayFor(
    req.principal.organizationId,
    req.principal.employeeId,
    requestedDate(req.query.date),
  )
  return sendData(res, { attendance })
}

export async function handleMyAttendanceMonth(req, res) {
  const data = await monthlyAttendance(
    req.principal.organizationId,
    req.principal.employeeId,
    requestedDate(req.query.date),
  )
  return sendData(res, data)
}

export async function handleMyAttendanceSummary(req, res) {
  const fallbackFrom = req.employee.job?.joinDate ?? new Date()
  const from = req.query.from ?? fallbackFrom
  const to = req.query.to ?? new Date()

  const payload = parseWith(attendanceRangeQuerySchema, {
    from: new Date(from).toISOString().slice(0, 10),
    to: new Date(to).toISOString().slice(0, 10),
  })

  const data = await summaryForRange(
    req.principal.organizationId,
    req.principal.employeeId,
    startOfDay(new Date(`${payload.from}T00:00:00.000Z`)),
    new Date(`${payload.to}T00:00:00.000Z`),
  )
  return sendData(res, data)
}

export async function handleTeamAttendanceToday(req, res) {
  return sendData(res, await teamAttendanceToday(scopeFor(req.principal), requestedDate(req.query.date)))
}

export async function handleTeamAttendanceStats(req, res) {
  return sendData(res, await teamAttendanceStats(scopeFor(req.principal), requestedDate(req.query.date)))
}

export async function handleTeamAttendanceRows(req, res) {
  return sendData(res, await teamAttendanceRows(scopeFor(req.principal), requestedDate(req.query.date)))
}

export async function handleTeamAttendanceMonth(req, res) {
  return sendData(res, await teamAttendanceMonth(scopeFor(req.principal), requestedDate(req.query.date)))
}

export async function handleTeamReports(req, res) {
  return sendData(res, await teamMonthlyReports(scopeFor(req.principal), requestedDate(req.query.date)))
}
