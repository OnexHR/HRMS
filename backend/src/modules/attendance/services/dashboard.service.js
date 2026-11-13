import { LATE_AFTER_MINUTES, MAX_BREAK_MINUTES, kolkataMinutesOfDay } from '@hrms/shared'

import { dateKey, endOfDay, startOfDay, timeZone } from '../../../lib/dates.js'
import { teamScope } from '../../../lib/scope.js'
import Employee from '../../employees/models/employee.model.js'
import LeaveRequest from '../../leave/models/leave-request.model.js'
import Task from '../../tasks/models/task.model.js'
import Meeting from '../../meetings/models/meeting.model.js'
import EmployeeQuery from '../../queries/models/employee-query.model.js'
import Attendance from '../models/attendance.model.js'
import { recentActivity } from '../../employees/services/activity.service.js'
import { balanceView, pendingForManager } from '../../leave/services/leave.service.js'
import { getTaskSummaryFor, teamTaskSummary } from '../../tasks/services/task.service.js'
import {
  getOpenAttendance,
  liveOvertimeMinutes,
  liveWorkingMinutes,
  monthlyAttendance,
  summaryForRange,
  teamAttendanceToday,
} from './attendance.service.js'

function minutesOf(value) {
  return kolkataMinutesOfDay(value, timeZone())
}

/**
 * Live attendance state for a day. An open session from a previous day is
 * returned instead of an empty new-day record so the live counters keep
 * running until the employee checks out.
 */
export async function attendanceTodayFor(organizationId, employeeId, date = new Date()) {
  const today = startOfDay(date)
  const tomorrow = endOfDay(today)

  const [record, open, leave] = await Promise.all([
    Attendance.findOne({
      organization: organizationId,
      employee: employeeId,
      date: today,
    }).lean(),
    getOpenAttendance(organizationId, employeeId),
    LeaveRequest.findOne({
      organization: organizationId,
      employee: employeeId,
      status: 'approved',
      fromDate: { $lt: tomorrow },
      toDate: { $gte: today },
    })
      .select('leaveType')
      .lean(),
  ])

  const current = record || open

  if (leave) {
    return {
      status: 'leave',
      leaveType: leave.leaveType || null,
      checkIn: null,
      checkOut: null,
      breakStart: null,
      breakMinutes: 0,
      workingMinutes: 0,
      overtimeMinutes: 0,
    }
  }

  if (!current) {
    return {
      status: 'absent',
      checkIn: null,
      checkOut: null,
      breakStart: null,
      breakMinutes: 0,
      workingMinutes: 0,
      overtimeMinutes: 0,
    }
  }

  const isOpen = Boolean(current.checkIn && !current.checkOut)
  let liveStatus = current.status
  if (isOpen) {
    const checkInMin = minutesOf(current.checkIn)
    liveStatus = checkInMin > LATE_AFTER_MINUTES ? 'late' : 'present'
  }

  return {
    status: current.breakStart ? 'on_break' : liveStatus,
    onBreak: Boolean(current.breakStart),
    checkIn: current.checkIn,
    checkOut: current.checkOut,
    breakStart: current.breakStart || null,
    breakMinutes: current.breakMinutes || 0,
    workingMinutes: isOpen ? liveWorkingMinutes(current) : current.workingMinutes || 0,
    overtimeMinutes: isOpen ? liveOvertimeMinutes(current) : current.overtimeMinutes || 0,
  }
}

export async function employeeDashboard({ organizationId, employee, date = new Date() }) {
  // Work summary covers the employment period: join date through the end date,
  // or through today while employment is ongoing.
  const joinDate = employee.job?.joinDate
    ? new Date(employee.job.joinDate)
    : new Date(startOfDay(date).getTime())
  const employmentEnd = employee.job?.endDate ? new Date(employee.job.endDate) : null
  let rangeEnd = employmentEnd
    ? new Date(Math.min(employmentEnd.getTime(), new Date(date).getTime()))
    : new Date(date)
  if (joinDate > rangeEnd) rangeEnd = new Date(joinDate)

  const [
    attendanceMonth,
    summary,
    recent,
    meetings,
    taskSummary,
    leave,
    pendingLeaves,
    attendanceToday,
  ] = await Promise.all([
    monthlyAttendance(organizationId, employee._id, date),
    summaryForRange(organizationId, employee._id, joinDate, rangeEnd),
    recentActivity(organizationId, employee._id, 15),
    Meeting.find({ organization: organizationId, participants: employee._id })
      .sort({ startTime: -1 })
      .limit(10)
      .populate('organizer', 'firstName lastName')
      .populate('participants', 'firstName lastName')
      .lean(),
    getTaskSummaryFor(organizationId, employee._id),
    LeaveRequest.find({ organization: organizationId, employee: employee._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    LeaveRequest.find({
      organization: organizationId,
      employee: employee._id,
      status: 'pending',
    })
      .sort({ fromDate: 1 })
      .lean(),
    attendanceTodayFor(organizationId, employee._id, date),
  ])

  summary.endDate = employmentEnd

  return {
    date: dateKey(date),
    attendanceToday,
    attendanceMonth,
    summary,
    recentActivity: recent,
    meetings,
    taskSummary,
    todayWorkSummary: {
      totalTasks: taskSummary?.total ?? 0,
      completed: taskSummary?.completed ?? 0,
      inProgress: taskSummary?.inProgress ?? 0,
      onHold: taskSummary?.onHold ?? 0,
      pending: taskSummary?.pending ?? 0,
      workingMinutes: attendanceToday.workingMinutes ?? 0,
      breakMinutes: attendanceToday.breakMinutes ?? 0,
      overtimeMinutes: attendanceToday.overtimeMinutes ?? 0,
      meetingsCount: meetings?.length ?? 0,
    },
    leaveBalance: balanceView(employee),
    leaveHistory: leave,
    pendingLeaves,
  }
}

/**
 * Manager reporting. An admin uses the same payload with organization-wide
 * scope. The donor looked queries up by the denormalized `employee.manager`
 * path; that relationship does not exist, so team ids are resolved first.
 */
export async function managerDashboard({ organizationId, principal, date = new Date() }) {
  const scope = teamScope(principal)
  const teamFilter = scope.filter

  const teamIds = await Employee.find(teamFilter).select('_id').lean()
  const ids = teamIds.map((member) => member._id)

  const [today, attendanceToday, pendingLeaves, taskSummary, tasks, queries, alerts, activity] =
    await Promise.all([
      teamAttendanceToday({ organizationId, managerId: principal.role === 'admin' ? null : principal.employeeId }, date),
      attendanceTodayFor(organizationId, principal.employeeId, date),
      pendingForManager({ organizationId, principal }),
      teamTaskSummary(organizationId, principal),
      Task.find({
        organization: organizationId,
        ...(principal.role === 'admin' ? {} : { assignedBy: principal.employeeId }),
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      EmployeeQuery.find({ organization: organizationId, employee: { $in: ids } })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      buildAlerts({ organizationId, teamFilter, ids, principal }),
      recentActivity(organizationId, principal.employeeId, 10),
    ])

  return {
    date: today.date,
    attendanceToday,
    attendance: today.stats,
    attendanceRows: today.rows,
    currentActivity: {
      onBreak: today.stats.onBreak,
      onBreakPct: today.stats.onBreakPct,
      onCall: today.stats.onCall,
      onCallPct: today.stats.onCallPct,
      abnormal: today.stats.abnormal,
      abnormalPct: today.stats.abnormalPct,
    },
    pendingLeaves,
    taskSummary: {
      total: taskSummary.total,
      completed: taskSummary.completed,
      inProgress: taskSummary.inProgress,
      overdue: taskSummary.overdue,
    },
    tasks,
    queries,
    alerts,
    recentActivity: activity,
  }
}

function timeLabel(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(date) {
  const now = startOfDay(new Date()).getTime()
  const day = startOfDay(date).getTime()
  const diffDays = Math.round((now - day) / 86_400_000)
  if (diffDays <= 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

async function buildAlerts({ organizationId, ids, teamFilter }) {
  const today = startOfDay(new Date())
  const tomorrow = endOfDay(today)
  const yesterday = new Date(today.getTime() - 86_400_000)
  const breakLimit = MAX_BREAK_MINUTES

  const team = await Employee.find(teamFilter)
    .select('_id firstName lastName')
    .lean()

  const [records, leaves, reviewedLeaves] = await Promise.all([
    ids.length
      ? Attendance.find({
          organization: organizationId,
          employee: { $in: ids },
          date: { $gte: today, $lt: tomorrow },
        }).lean()
      : [],
    ids.length
      ? LeaveRequest.find({
          organization: organizationId,
          employee: { $in: ids },
          status: 'approved',
          fromDate: { $lt: tomorrow },
          toDate: { $gte: today },
        }).lean()
      : [],
    ids.length
      ? LeaveRequest.find({
          organization: organizationId,
          employee: { $in: ids },
          status: { $in: ['approved', 'rejected'] },
          reviewedAt: { $gte: yesterday },
        })
          .populate('employee', 'firstName lastName')
          .sort({ reviewedAt: -1 })
          .limit(10)
          .lean()
      : [],
  ])

  const leaveIds = new Set(leaves.map((leave) => String(leave.employee)))
  const alerts = []

  for (const member of team) {
    const record = records.find((entry) => String(entry.employee) === String(member._id))
    if (leaveIds.has(String(member._id))) continue
    const name = `${member.firstName} ${member.lastName}`

    if (!record) {
      alerts.push({ category: 'Absent', text: `${name} has not checked in yet.`, time: 'Today' })
      continue
    }

    if (record.breakStart) {
      const minutesOnBreak = Math.round((Date.now() - new Date(record.breakStart).getTime()) / 60_000)
      if (minutesOnBreak > breakLimit) {
        alerts.push({
          category: 'Exceeded Break Time',
          text: `${name} has been on break for ${minutesOnBreak} min (limit ${breakLimit} min).`,
          time: timeLabel(record.breakStart),
        })
      }
    }

    if ((record.breakMinutes || 0) > breakLimit * 2) {
      alerts.push({
        category: 'Abnormal',
        text: `${name} has logged ${record.breakMinutes} break minutes today.`,
        time: 'Today',
      })
    }
  }

  for (const leave of reviewedLeaves) {
    if (!leave.employee) continue
    const name = `${leave.employee.firstName} ${leave.employee.lastName}`
    alerts.push({
      category: 'Other',
      text:
        leave.status === 'approved'
          ? `${name}'s leave was approved.`
          : `${name}'s leave was rejected.`,
      time: dayLabel(leave.reviewedAt),
    })
  }

  return alerts
}
