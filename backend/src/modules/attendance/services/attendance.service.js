import mongoose from 'mongoose'

import {
  HALF_DAY_CHECKIN_MINUTES,
  HALF_DAY_CHECKOUT_MINUTES,
  LATE_AFTER_MINUTES,
  LATE_NIGHT_CHECKIN_MINUTES,
  MAX_BREAK_MINUTES,
  OVERTIME_END_MINUTES,
  OVERTIME_START_MINUTES,
  STANDARD_DAY_MINUTES,
  computeDayStatus,
  kolkataMinutesOfDay,
  liveStatusFor,
} from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import {
  addDays,
  dateKey,
  dateKeysBetween,
  dayStartMs,
  endOfDay,
  isWeekdayKey,
  minutesBetween,
  minutesLate,
  monthRange,
  startOfDay,
  timeZone,
} from '../../../lib/dates.js'
import { logActivity } from '../../employees/services/activity.service.js'
import Employee from '../../employees/models/employee.model.js'
import Attendance from '../models/attendance.model.js'
import LeaveRequest from '../../leave/models/leave-request.model.js'
import Meeting from '../../meetings/models/meeting.model.js'
import Task from '../../tasks/models/task.model.js'

export { computeDayStatus, liveStatusFor }

const DAY_MS = 24 * 60 * 60 * 1000

function minutesOf(value) {
  return kolkataMinutesOfDay(value, timeZone())
}

function sessionsOf(record) {
  if (Array.isArray(record.sessions) && record.sessions.length) return record.sessions
  return [{ checkIn: record.checkIn, checkOut: record.checkOut }]
}

/** Real worked minutes for a closed day: sessions minus completed breaks. */
export function workingMinutesFor(record) {
  if (!record) return 0
  let total = 0
  for (const session of sessionsOf(record)) {
    if (session.checkIn && session.checkOut) {
      const ms = new Date(session.checkOut).getTime() - new Date(session.checkIn).getTime()
      if (ms > 0) total += Math.floor(ms / 60_000)
    }
  }
  return Math.max(0, total - Math.floor(record.breakMinutes || 0))
}

export async function getAttendance(organizationId, employeeId, date = new Date()) {
  return Attendance.findOne({
    organization: organizationId,
    employee: employeeId,
    date: startOfDay(date),
  })
}

export async function approvedLeaveOn(organizationId, employeeId, date = new Date()) {
  return LeaveRequest.findOne({
    organization: organizationId,
    employee: employeeId,
    status: 'approved',
    fromDate: { $lte: endOfDay(date) },
    toDate: { $gte: startOfDay(date) },
  })
    .select('leaveType fromDate toDate')
    .lean()
}

const leaveTypeLabel = (leaveType) => {
  if (leaveType === 'unpaid') return 'unpaid leave'
  if (leaveType === 'sick') return 'sick leave'
  return leaveType ? `${leaveType} leave` : 'approved leave'
}

function resolveOpenSession(record) {
  const sessions = Array.isArray(record.sessions) ? record.sessions : []
  const open = sessions.find((session) => session.checkIn && !session.checkOut)
  if (open) return { checkIn: open.checkIn, legacy: false }
  if (record.checkIn && !record.checkOut && sessions.length === 0) {
    return { checkIn: record.checkIn, legacy: true }
  }
  return null
}

export function planCheckIn(record, now = new Date(), hasLeave = false) {
  const sessions = (record.sessions || []).map((session) => ({
    checkIn: session.checkIn,
    checkOut: session.checkOut,
  }))
  if (sessions.some((session) => session.checkIn && !session.checkOut)) return null
  if (record.checkIn && !record.checkOut) return null

  sessions.push({ checkIn: now, checkOut: null })

  return {
    filter: {
      sessions: { $not: { $elemMatch: { checkIn: { $ne: null }, checkOut: null } } },
      $or: [{ checkIn: null }, { checkOut: { $ne: null } }],
    },
    update: {
      $set: {
        sessions,
        checkOut: null,
        ...(record.checkIn ? {} : { checkIn: now }),
        workingMinutes: 0,
        overtimeMinutes: 0,
        status: computeDayStatus({
          hasCheckIn: true,
          checkInMin: minutesOf(now),
          checkOutMin: null,
          hasLeave,
        }),
      },
    },
  }
}

export async function checkIn(organizationId, employeeId) {
  const today = startOfDay(new Date())
  const now = new Date()

  const leave = await approvedLeaveOn(organizationId, employeeId)
  if (leave) {
    const nowMin = minutesOf(now)
    if (nowMin < HALF_DAY_CHECKIN_MINUTES) {
      throw ApiError.conflict(
        `You are on approved ${leaveTypeLabel(leave.leaveType)} today, so check-in is not allowed before 1:00 PM. You may check in at or after 1:00 PM, or contact your manager if this is a mistake.`,
      )
    }
  }

  const existing = await Attendance.findOne({
    organization: organizationId,
    employee: employeeId,
    date: today,
  })

  let record
  if (existing) {
    const plan = planCheckIn(existing, now, Boolean(leave))
    if (!plan) throw ApiError.conflict('Already checked in.')

    record = await Attendance.findOneAndUpdate(
      { _id: existing._id, ...plan.filter },
      plan.update,
      { new: true },
    )
    if (!record) throw ApiError.conflict('Already checked in.')
  } else {
    record = new Attendance({
      organization: organizationId,
      employee: employeeId,
      date: today,
      status: computeDayStatus({
        hasCheckIn: true,
        checkInMin: minutesOf(now),
        checkOutMin: null,
        hasLeave: Boolean(leave),
      }),
      sessions: [{ checkIn: now, checkOut: null }],
      checkIn: now,
      checkOut: null,
      breakMinutes: 0,
      workingMinutes: 0,
      overtimeMinutes: 0,
    })

    try {
      await record.save()
    } catch (error) {
      if (error?.code === 11000 || error?.cause?.code === 11000) {
        throw ApiError.conflict('Already checked in.')
      }
      throw error
    }
  }

  await logActivity(organizationId, employeeId, 'checkin', { at: now })
  return record
}

async function requireTodayRecord(organizationId, employeeId) {
  const today = startOfDay(new Date())
  let record = await Attendance.findOne({
    organization: organizationId,
    employee: employeeId,
    date: today,
  })
  if (!record) record = await getOpenAttendance(organizationId, employeeId, { lean: false })
  if (!record) throw ApiError.validation('Check in before using this action.')
  return record
}

export async function breakStart(organizationId, employeeId) {
  const record = await requireTodayRecord(organizationId, employeeId)
  if (record.breakStart) throw ApiError.conflict('Break already in progress.')

  record.breakStart = new Date()
  record.breakEnd = null
  await record.save()
  await logActivity(organizationId, employeeId, 'break_start', { at: record.breakStart })
  return record
}

export async function breakEnd(organizationId, employeeId) {
  const record = await requireTodayRecord(organizationId, employeeId)
  if (!record.breakStart) throw ApiError.validation('No break in progress.')

  const startedAt = new Date(record.breakStart)
  const endedAt = new Date()
  const autoEnd = new Date(startedAt.getTime() + MAX_BREAK_MINUTES * 60_000)
  const effectiveEnd = endedAt > autoEnd ? autoEnd : endedAt
  const minutes = Math.max(
    0,
    Math.floor((effectiveEnd.getTime() - startedAt.getTime()) / 60_000),
  )

  record.breaks = record.breaks || []
  record.breaks.push({ start: startedAt, end: effectiveEnd })
  record.breakMinutes = (record.breakMinutes || 0) + minutes
  record.breakStart = null
  record.breakEnd = null
  recomputeHours(record)

  await record.save()
  await logActivity(organizationId, employeeId, 'break_end', { minutes })
  return record
}

export function planCheckOut(record, now = new Date()) {
  const open = resolveOpenSession(record)
  if (!open) return null

  const sessions = (record.sessions || []).map((session) => ({
    checkIn: session.checkIn,
    checkOut: session.checkOut,
  }))
  if (open.legacy) sessions.push({ checkIn: record.checkIn, checkOut: null })

  const target = sessions.find((session) => session.checkIn && !session.checkOut)
  target.checkOut = now

  const state = {
    sessions,
    breaks: record.breaks || [],
    breakStart: record.breakStart || null,
    breakMinutes: record.breakMinutes || 0,
    checkIn: record.checkIn,
    checkOut: now,
  }
  recomputeHours(state)

  return {
    legacy: open.legacy,
    sessionCheckIn: target.checkIn,
    fields: {
      sessions,
      checkOut: now,
      workingMinutes: state.workingMinutes,
      overtimeMinutes: state.overtimeMinutes,
      status: computeDayStatus({
        hasCheckIn: true,
        checkInMin: minutesOf(new Date(record.checkIn)),
        checkOutMin: minutesOf(now),
        hasLeave: false,
      }),
    },
  }
}

export async function checkOut(organizationId, employeeId) {
  const record = await requireTodayRecord(organizationId, employeeId)
  if (record.breakStart) throw ApiError.validation('End your current break before checking out.')

  const now = new Date()
  const plan = planCheckOut(record, now)
  if (!plan) throw ApiError.validation('No open session to check out.')

  const filter = plan.legacy
    ? {
        _id: record._id,
        checkIn: record.checkIn,
        checkOut: null,
        sessions: { $not: { $elemMatch: { checkIn: { $ne: null } } } },
      }
    : {
        _id: record._id,
        sessions: { $elemMatch: { checkIn: plan.sessionCheckIn, checkOut: null } },
      }

  const updated = await Attendance.findOneAndUpdate(filter, { $set: plan.fields }, { new: true })
  if (!updated) throw ApiError.validation('No open session to check out.')

  await autoEndActiveMeetings(organizationId, employeeId)
  await logActivity(organizationId, employeeId, 'checkout', { at: now })
  return updated
}

function overlapMinutes(from, to, windowStart, windowEnd) {
  const start = Math.max(new Date(from).getTime(), windowStart)
  const end = Math.min(new Date(to).getTime(), windowEnd)
  return end > start ? (end - start) / 60_000 : 0
}

function overtimeWindows(checkIn, end) {
  const windows = []
  const firstDay = dayStartMs(checkIn)
  const lastDay = dayStartMs(end)

  for (let day = firstDay; day <= lastDay; day += DAY_MS) {
    const isCheckInDay = day === firstDay
    const evening = day + OVERTIME_START_MINUTES * 60_000
    const midnight = day + DAY_MS
    windows.push({ start: evening, end: midnight })

    if (!isCheckInDay) {
      const morning = day + OVERTIME_END_MINUTES * 60_000
      windows.push({ start: day, end: morning })
    }
  }
  return windows
}

function breakIntervals(record, endMs) {
  const intervals = (record.breaks || []).map((entry) => ({
    start: new Date(entry.start).getTime(),
    end: new Date(entry.end).getTime(),
  }))

  if (record.breakStart) {
    const start = new Date(record.breakStart).getTime()
    const autoEnd = start + MAX_BREAK_MINUTES * 60_000
    const end = Math.min(endMs, autoEnd)
    if (end > start) intervals.push({ start, end })
  }
  return intervals
}

export function overtimeMinutesFor(record, end) {
  if (!record) return 0
  const effectiveEnd = end ? new Date(end).getTime() : Date.now()
  const breaks = breakIntervals(record, effectiveEnd)
  let total = 0

  for (const session of sessionsOf(record)) {
    const checkIn = new Date(session.checkIn).getTime()
    if (Number.isNaN(checkIn)) continue
    const checkOut = session.checkOut ? new Date(session.checkOut).getTime() : effectiveEnd
    if (checkOut <= checkIn) continue

    const windows = overtimeWindows(checkIn, checkOut)
    for (const window of windows) {
      total += overlapMinutes(checkIn, checkOut, window.start, window.end)
    }
    for (const entry of breaks) {
      for (const window of windows) {
        total -= overlapMinutes(entry.start, entry.end, window.start, window.end)
      }
    }
  }

  return Math.max(0, Math.floor(total))
}

export function recomputeHours(record) {
  record.workingMinutes = workingMinutesFor(record)
  record.overtimeMinutes = record.checkOut
    ? overtimeMinutesFor(record, record.checkOut)
    : 0
  return record
}

export async function monthlyAttendance(organizationId, employeeId, date = new Date()) {
  const { start, end } = monthRange(date)
  const [records, leaves] = await Promise.all([
    Attendance.find({
      organization: organizationId,
      employee: employeeId,
      date: { $gte: start, $lt: end },
    }).lean(),
    LeaveRequest.find({
      organization: organizationId,
      employee: employeeId,
      status: { $in: ['approved', 'pending'] },
      fromDate: { $lt: end },
      toDate: { $gte: start },
    }).lean(),
  ])

  const dayMap = {}
  const leaveByType = new Map()
  for (const leave of leaves) {
    if (leave.status !== 'approved') continue
    const fromKey = dateKey(Math.max(start.getTime(), new Date(leave.fromDate).getTime()))
    const toKey = dateKey(Math.min(new Date(leave.toDate).getTime(), end.getTime() - 1))
    for (const key of dateKeysBetween(fromKey, toKey)) {
      leaveByType.set(key, leave.leaveType)
    }
  }

  for (const record of records) {
    const key = dateKey(record.date)
    const hasLeave = leaveByType.has(key)
    const hasCheckIn = Boolean(record.checkIn)
    const checkInMin = hasCheckIn ? minutesOf(record.checkIn) : null
    const checkOutMin = record.checkOut ? minutesOf(record.checkOut) : null

    let workingMinutes = record.workingMinutes || 0
    if (record.checkIn && !record.checkOut) workingMinutes = liveWorkingMinutes(record)

    const overtimeMinutes =
      record.checkIn && !record.checkOut
        ? liveOvertimeMinutes(record)
        : record.overtimeMinutes

    dayMap[key] = {
      status: computeDayStatus({ hasCheckIn, checkInMin, checkOutMin, hasLeave }),
      date: key,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      workingHours: `${Math.floor(workingMinutes / 60)}h ${workingMinutes % 60}m`,
      breakTime: `${Math.floor(record.breakMinutes / 60)}h ${record.breakMinutes % 60}m`,
      overtime:
        overtimeMinutes > 0
          ? `${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m`
          : null,
      tasksCompleted: record.tasksCompleted,
      leaveType: hasLeave ? leaveByType.get(key) : undefined,
    }
  }

  for (const [key, leaveType] of leaveByType) {
    if (!dayMap[key]) dayMap[key] = { status: 'Leave', date: key, leaveType }
  }

  return {
    month: startOfDay(date).toISOString(),
    dayMap,
    records: records.map((record) => ({
      ...record,
      date: startOfDay(record.date).toISOString(),
    })),
    summary: summarizeRecords(records),
  }
}

function summarizeRecords(records, now = new Date()) {
  return records.reduce(
    (summary, record) => {
      const isOpen = record.checkIn && !record.checkOut
      summary.totalWorkingMinutes += isOpen
        ? liveWorkingMinutes(record, now)
        : record.workingMinutes || 0
      summary.totalBreakMinutes += record.breakMinutes || 0
      summary.totalOvertimeMinutes += isOpen
        ? liveOvertimeMinutes(record, now)
        : record.overtimeMinutes || 0
      return summary
    },
    { totalWorkingMinutes: 0, totalBreakMinutes: 0, totalOvertimeMinutes: 0 },
  )
}

export async function summaryForRange(organizationId, employeeId, from, to) {
  const start = startOfDay(from)
  const end = endOfDay(to)
  if (end <= start) throw ApiError.validation('Range is invalid.')

  const [aggregate] = await Attendance.aggregate([
    {
      $match: {
        organization: new mongoose.Types.ObjectId(organizationId),
        employee: new mongoose.Types.ObjectId(employeeId),
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        totalWorkingMinutes: { $sum: { $ifNull: ['$workingMinutes', 0] } },
        totalOvertimeMinutes: { $sum: { $ifNull: ['$overtimeMinutes', 0] } },
        totalBreakMinutes: { $sum: { $ifNull: ['$breakMinutes', 0] } },
      },
    },
  ])

  const [records, leaves, tasksCompleted, open] = await Promise.all([
    Attendance.find({
      organization: organizationId,
      employee: employeeId,
      date: { $gte: start, $lt: end },
    }).lean(),
    LeaveRequest.find({
      organization: organizationId,
      employee: employeeId,
      status: 'approved',
      fromDate: { $lt: end },
      toDate: { $gte: start },
    }).lean(),
    Task.countDocuments({
      organization: organizationId,
      assignedTo: employeeId,
      status: 'Completed',
      completedAt: { $gte: start, $lt: end },
    }),
    getOpenAttendance(organizationId, employeeId),
  ])

  const leaveDays = new Set()
  for (const leave of leaves) {
    const fromKey = dateKey(Math.max(start.getTime(), new Date(leave.fromDate).getTime()))
    const toKey = dateKey(Math.min(new Date(leave.toDate).getTime(), end.getTime() - 1))
    for (const key of dateKeysBetween(fromKey, toKey)) leaveDays.add(key)
  }

  const recordsByDay = new Map()
  for (const record of records) recordsByDay.set(dateKey(record.date), record)

  let presentDays = 0
  for (const [key, record] of recordsByDay) {
    const status = computeDayStatus({
      hasCheckIn: Boolean(record.checkIn),
      checkInMin: record.checkIn ? minutesOf(record.checkIn) : null,
      checkOutMin: record.checkOut ? minutesOf(record.checkOut) : null,
      hasLeave: leaveDays.has(key),
    })
    if (['present', 'late', 'half_day'].includes(status)) presentDays += 1
  }

  let liveWorking = 0
  let liveOvertime = 0
  if (open && open.date >= start && open.date < end) {
    liveWorking = liveWorkingMinutes(open)
    liveOvertime = liveOvertimeMinutes(open)
  }

  return {
    startDate: start,
    endDate: end,
    totalWorkingMinutes: (aggregate?.totalWorkingMinutes || 0) + liveWorking,
    totalOvertimeMinutes: (aggregate?.totalOvertimeMinutes || 0) + liveOvertime,
    presentDays,
    leaveDays: leaveDays.size,
    tasksCompleted,
    totalBreakMinutes: aggregate?.totalBreakMinutes || 0,
  }
}

export function liveMeetingFilter(employeeIds, now = new Date()) {
  return {
    participants: { $in: employeeIds },
    status: { $in: ['scheduled', 'active'] },
    startTime: { $lte: now },
    $or: [{ endTime: null }, { endTime: { $gt: now } }],
  }
}

async function fetchLiveMeetings(organizationId, employeeIds, now = new Date()) {
  if (!employeeIds.length) return []
  return Meeting.find({
    ...liveMeetingFilter(employeeIds, now),
    organization: organizationId,
  })
    .populate('participants', 'firstName lastName')
    .select('title participants')
    .lean()
}

export async function ongoingMeetingParticipantIds(organizationId, employeeIds, now = new Date()) {
  const meetings = await fetchLiveMeetings(organizationId, employeeIds, now)
  return new Set(
    meetings.flatMap((meeting) =>
      (meeting.participants || []).map((participant) => String(participant._id)),
    ),
  )
}

export async function autoEndActiveMeetings(organizationId, employeeId) {
  const active = await Meeting.find({
    organization: organizationId,
    organizer: employeeId,
    status: 'active',
  })

  const now = new Date()
  for (const meeting of active) {
    meeting.status = 'ended'
    meeting.actualEndedAt = now
    meeting.actualDuration = meeting.actualStartedAt
      ? Math.max(0, Math.round((now.getTime() - meeting.actualStartedAt.getTime()) / 1000))
      : 0
    await meeting.save()
  }
  return active.length
}

export function deriveActivity({ onLeave, onBreak, onCall, checkIn, checkOut }) {
  if (onLeave) return 'Offline'
  if (onBreak) return 'Break'
  if (onCall) return 'On Call'
  if (!checkIn || checkOut) return 'Offline'
  return 'Online'
}

export function aggregateMeetingPartners(meetings) {
  const byMember = new Map()

  for (const meeting of meetings) {
    const participants = meeting.participants || []
    const names = participants.map(
      (participant) => `${participant.firstName} ${participant.lastName}`,
    )

    participants.forEach((participant, index) => {
      const entry = byMember.get(String(participant._id)) ?? { titles: [], partners: new Map() }
      if (meeting.title && !entry.titles.includes(meeting.title)) entry.titles.push(meeting.title)
      names.forEach((name, nameIndex) => {
        if (nameIndex !== index) entry.partners.set(name, true)
      })
      byMember.set(String(participant._id), entry)
    })
  }

  return byMember
}

export async function onCallMeetingPartners(organizationId, employeeIds, now = new Date()) {
  return aggregateMeetingPartners(await fetchLiveMeetings(organizationId, employeeIds, now))
}

async function teamMembers(scope) {
  const filter = { organization: scope.organizationId, 'job.isActive': true }
  if (scope.managerId) filter.manager = scope.managerId
  return Employee.find(filter)
    .select('firstName lastName employeeCode department role')
    .lean()
}

export async function teamAttendanceToday(scope, date = new Date()) {
  return loadTeamAttendanceToday(scope, date)
}

export async function teamAttendanceStats(scope, date = new Date()) {
  const { date: day, stats } = await loadTeamAttendanceToday(scope, date)
  return { date: day, stats }
}

export async function teamAttendanceRows(scope, date = new Date()) {
  const { date: day, rows } = await loadTeamAttendanceToday(scope, date)
  return { date: day, rows }
}

async function loadTeamAttendanceToday(scope, date = new Date()) {
  const today = startOfDay(date)
  const todayEnd = endOfDay(today)
  const now = new Date()
  const team = await teamMembers(scope)
  const ids = team.map((member) => member._id)

  let records = []
  let leaves = []
  if (ids.length) {
    ;[records, leaves] = await Promise.all([
      Attendance.find({
        organization: scope.organizationId,
        employee: { $in: ids },
        date: today,
      }).lean(),
      LeaveRequest.find({
        organization: scope.organizationId,
        employee: { $in: ids },
        status: 'approved',
        fromDate: { $lt: todayEnd },
        toDate: { $gte: today },
      }).lean(),
    ])
  }

  const onLeaveIds = new Set(leaves.map((leave) => String(leave.employee)))
  const onCallPartners = await onCallMeetingPartners(scope.organizationId, ids, now)
  const onCallIds = new Set(onCallPartners.keys())

  const rows = team.map((member) => {
    const record = records.find((entry) => String(entry.employee) === String(member._id))
    const onLeave = onLeaveIds.has(String(member._id))
    const late = record ? minutesLate(record.checkIn, today) : 0

    const status = onLeave
      ? 'Leave'
      : record
        ? record.breakStart
          ? 'Break'
          : record.status === 'absent'
            ? 'Absent'
            : late > 0
              ? 'Late'
              : 'Present'
        : 'Absent'

    return {
      _id: member._id,
      name: `${member.firstName} ${member.lastName}`,
      employeeCode: member.employeeCode,
      department: member.department,
      role: member.role,
      attendance: status,
      activity: deriveActivity({
        onLeave,
        onBreak: Boolean(record?.breakStart),
        onCall: onCallIds.has(String(member._id)),
        checkIn: record?.checkIn,
        checkOut: record?.checkOut,
      }),
      checkIn: record?.checkIn || null,
      checkOut: record?.checkOut || null,
      workingMinutes: liveWorkingMinutes(record, now),
      breakMinutes:
        (record?.breakMinutes || 0) +
        (record?.breakStart ? minutesBetween(record.breakStart, now) : 0),
      lateMinutes: late,
    }
  })

  const total = rows.length
  const count = (label) => rows.filter((row) => row.attendance === label).length
  const present = count('Present')
  const late = count('Late')
  const absent = count('Absent')
  const onLeave = count('Leave')
  const onBreakRows = rows.filter((row) => row.activity === 'Break')
  const onCallRows = rows.filter((row) => row.activity === 'On Call')

  const abnormalRows = rows.filter(
    (row) =>
      row.attendance !== 'Leave' &&
      (row.lateMinutes > 0 || row.breakMinutes > MAX_BREAK_MINUTES * 2),
  )

  const pct = (value) => (total ? Math.round((value / total) * 100) : 0)
  const names = (list) => list.map((member) => member.name)

  return {
    date: today,
    stats: {
      total,
      present,
      late,
      absent,
      presentPct: pct(present),
      latePct: pct(late),
      absentPct: pct(absent),
      onLeave,
      onLeavePct: pct(onLeave),
      onBreak: onBreakRows.length,
      onBreakPct: pct(onBreakRows.length),
      onCall: onCallRows.length,
      onCallPct: pct(onCallRows.length),
      abnormal: abnormalRows.length,
      abnormalPct: pct(abnormalRows.length),
      onBreakNames: names(onBreakRows),
      onCallNames: names(onCallRows),
      abnormalNames: names(abnormalRows),
      onCallMeetings: onCallRows.map((row) => {
        const info = onCallPartners.get(String(row._id))
        return {
          name: row.name,
          title: info?.titles[0] ?? null,
          with: info ? [...info.partners].join(', ') : '',
        }
      }),
    },
    rows,
  }
}

export function liveWorkingMinutes(record, now = new Date()) {
  if (!record) return 0
  const nowMs = now.getTime()
  let total = 0

  for (const session of sessionsOf(record)) {
    const checkIn = new Date(session.checkIn).getTime()
    if (Number.isNaN(checkIn)) continue
    const checkOut = session.checkOut ? new Date(session.checkOut).getTime() : nowMs
    if (checkOut > checkIn) total += Math.floor((checkOut - checkIn) / 60_000)
  }

  let breakTime = Math.floor(record.breakMinutes || 0)
  if (record.breakStart) {
    const start = new Date(record.breakStart).getTime()
    const autoEnd = start + MAX_BREAK_MINUTES * 60_000
    const end = Math.min(nowMs, autoEnd)
    if (end > start) breakTime += Math.floor((end - start) / 60_000)
  }

  return Math.max(0, total - breakTime)
}

export function liveOvertimeMinutes(record, now = new Date()) {
  if (!record?.checkIn || record.checkOut) return record?.overtimeMinutes || 0
  return overtimeMinutesFor(record, now)
}

export async function getOpenAttendance(organizationId, employeeId, { lean = true } = {}) {
  const query = Attendance.findOne({
    organization: organizationId,
    employee: employeeId,
    checkIn: { $ne: null },
    checkOut: null,
  }).sort({ checkIn: -1 })

  return lean ? query.lean() : query
}

export async function teamAttendanceMonth(scope, date = new Date()) {
  const { start, end } = monthRange(date)
  const team = await Employee.find({
    organization: scope.organizationId,
    ...(scope.managerId ? { manager: scope.managerId } : {}),
    'job.isActive': true,
  })
    .select('firstName lastName employeeCode department')
    .lean()

  const ids = team.map((member) => member._id)
  const records = ids.length
    ? await Attendance.find({
        organization: scope.organizationId,
        employee: { $in: ids },
        date: { $gte: start, $lt: end },
      }).lean()
    : []

  return { start, end, team, records }
}

export function buildMonthlyReport(member, records, leaves, { start, end }) {
  const leaveByDay = new Map()
  for (const leave of leaves) {
    const fromKey = dateKey(Math.max(start.getTime(), new Date(leave.fromDate).getTime()))
    const toKey = dateKey(Math.min(new Date(leave.toDate).getTime(), end.getTime() - 1))
    for (const key of dateKeysBetween(fromKey, toKey)) {
      if (isWeekdayKey(key)) leaveByDay.set(key, leave.leaveType || 'full_day')
    }
  }

  const recordByDay = new Map()
  for (const record of records) recordByDay.set(dateKey(record.date), record)

  const present = []
  const late = []
  const absent = []
  const onLeave = []
  const days = []

  for (const key of dateKeysBetween(dateKey(start), dateKey(addDays(end, -1)))) {
    if (!isWeekdayKey(key)) continue

    const dayDate = new Date(`${key}T00:00:00.000Z`)
    const leaveType = leaveByDay.get(key)
    const record = recordByDay.get(key)
    const isLate = record ? minutesLate(record.checkIn, dayDate) > 0 : false

    if (leaveType) {
      onLeave.push({ date: key, status: 'leave', leaveType })
    } else if (!record || record.status === 'absent') {
      absent.push({ date: key, status: 'absent' })
    } else if (isLate) {
      late.push({ date: key, status: 'late' })
    } else {
      present.push({ date: key, status: 'present' })
    }

    days.push(
      leaveType
        ? { date: key, status: 'leave', leaveType }
        : record && record.status !== 'absent'
          ? {
              date: key,
              status: isLate ? 'late' : 'present',
              checkIn: record.checkIn ?? null,
              checkOut: record.checkOut ?? null,
              workingMinutes: record.workingMinutes || 0,
              breakMinutes: record.breakMinutes || 0,
              overtimeMinutes: record.overtimeMinutes || 0,
            }
          : { date: key, status: 'absent' },
    )
  }

  const workingMinutes = days.reduce((total, day) => total + (day.workingMinutes || 0), 0)
  const breakMinutes = days.reduce((total, day) => total + (day.breakMinutes || 0), 0)
  const overtimeMinutes = days.reduce((total, day) => total + (day.overtimeMinutes || 0), 0)
  const expected = present.length + late.length + absent.length + onLeave.length

  return {
    member: {
      _id: member._id,
      name: `${member.firstName} ${member.lastName}`,
      employeeCode: member.employeeCode,
      department: member.department,
    },
    summary: {
      present: present.length,
      late: late.length,
      absent: absent.length,
      onLeave: onLeave.length,
      workingMinutes,
      breakMinutes,
      overtimeMinutes,
      attendanceRate:
        expected > 0 ? Math.round(((present.length + late.length) / expected) * 100) : 0,
    },
    days,
  }
}

export async function teamMonthlyReports(scope, date = new Date()) {
  const { start, end } = monthRange(date)
  const team = await Employee.find({
    organization: scope.organizationId,
    ...(scope.managerId ? { manager: scope.managerId } : {}),
    'job.isActive': true,
  })
    .select('firstName lastName employeeCode department')
    .sort('firstName lastName')
    .lean()

  const ids = team.map((member) => member._id)
  const [records, leaves] = ids.length
    ? await Promise.all([
        Attendance.find({
          organization: scope.organizationId,
          employee: { $in: ids },
          date: { $gte: start, $lt: end },
        }).lean(),
        LeaveRequest.find({
          organization: scope.organizationId,
          employee: { $in: ids },
          status: 'approved',
          fromDate: { $lt: end },
          toDate: { $gte: start },
        }).lean(),
      ])
    : [[], []]

  const recordsByEmployee = new Map()
  for (const record of records) {
    const list = recordsByEmployee.get(String(record.employee)) ?? []
    list.push(record)
    recordsByEmployee.set(String(record.employee), list)
  }

  const leavesByEmployee = new Map()
  for (const leave of leaves) {
    const list = leavesByEmployee.get(String(leave.employee)) ?? []
    list.push(leave)
    leavesByEmployee.set(String(leave.employee), list)
  }

  const reports = team.map((member) =>
    buildMonthlyReport(
      member,
      recordsByEmployee.get(String(member._id)) ?? [],
      leavesByEmployee.get(String(member._id)) ?? [],
      { start, end },
    ),
  )

  return { date: start, end, reports }
}

export { STANDARD_DAY_MINUTES, LATE_AFTER_MINUTES, MAX_BREAK_MINUTES }
