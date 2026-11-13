import { MAX_ACTIVE_MEETINGS_PER_ORGANIZER } from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { dateKey, monthRange } from '../../../lib/dates.js'
import Employee from '../../employees/models/employee.model.js'
import EmployeeQuery from '../../queries/models/employee-query.model.js'
import Task from '../../tasks/models/task.model.js'
import Meeting from '../models/meeting.model.js'
import { validateMeetingCreate } from '../validators/meeting.validator.js'

export function generateMeetUrl() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'
  const group = (length) =>
    Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return `https://meet.google.com/${group(3)}-${group(4)}-${group(3)}`.toLowerCase()
}

export async function availabilityMapFor(organizationId, employeeIds) {
  const map = {}
  if (!employeeIds?.length) return map
  for (const id of employeeIds) map[id] = { status: 'available', expectedEndAt: null }

  const active = await Meeting.find({
    organization: organizationId,
    status: 'active',
    participants: { $in: employeeIds },
  })
    .select('participants expectedEndAt')
    .lean()

  for (const meeting of active) {
    for (const participantId of meeting.participants) {
      const key = String(participantId)
      if (key in map) {
        map[key] = { status: 'unavailable', expectedEndAt: meeting.expectedEndAt }
      }
    }
  }
  return map
}

export async function activeMeetingParticipantIds(organizationId, employeeIds) {
  const ids = new Set()
  if (!employeeIds?.length) return ids

  const active = await Meeting.find({
    organization: organizationId,
    status: 'active',
    participants: { $in: employeeIds },
  })
    .select('participants')
    .lean()

  for (const meeting of active) {
    for (const participantId of meeting.participants) ids.add(String(participantId))
  }
  return ids
}

export async function listMeetings({ organizationId, employeeId, upcoming }) {
  const filter = { organization: organizationId, participants: employeeId }
  if (upcoming === 'true') {
    filter.status = { $in: ['scheduled', 'active'] }
    filter.endTime = { $gte: new Date() }
  }

  return Meeting.find(filter)
    .populate('organizer', 'firstName lastName employeeCode')
    .populate('participants', 'firstName lastName employeeCode')
    .sort({ startTime: 1 })
    .lean()
}

export async function getActiveMeeting(organizationId, employeeId) {
  return Meeting.findOne({
    organization: organizationId,
    organizer: employeeId,
    status: 'active',
  })
    .populate('organizer', 'firstName lastName employeeCode')
    .populate('participants', 'firstName lastName employeeCode')
    .lean()
}

export async function createMeeting({ organizationId, organizer, body }) {
  const payload = validateMeetingCreate(body)

  const participantIds = [...new Set([organizer.employeeId, ...payload.participants])]
  const participants = await Employee.find({
    organization: organizationId,
    _id: { $in: participantIds },
    'job.isActive': true,
  })
    .select('_id')
    .lean()

  if (participants.length !== participantIds.length) {
    throw ApiError.validation('Every participant must be an active employee in this organization.')
  }

  const busy = await activeMeetingParticipantIds(organizationId, participantIds)
  if (busy.size > 0) {
    const names = await Employee.find({
      organization: organizationId,
      _id: { $in: [...busy] },
    })
      .select('firstName lastName')
      .lean()
    throw ApiError.conflict(
      `Cannot schedule: ${names.map((person) => `${person.firstName} ${person.lastName}`).join(', ')} currently has an active meeting.`,
    )
  }

  return Meeting.create({
    organization: organizationId,
    organizer: organizer.employeeId,
    title: payload.title,
    // Decision 7 (locked): user-supplied links only. No generated URL.
    meetingLink: payload.meetingLink,
    participants: participantIds,
    startTime: payload.startTime,
    endTime: payload.endTime,
    durationMin: payload.durationMin,
    expectedDuration: payload.durationMin,
    expectedEndAt:
      payload.durationMin > 0
        ? new Date(payload.startTime.getTime() + payload.durationMin * 60_000)
        : null,
    status: 'scheduled',
  })
}

export async function startMeeting({ organizationId, employeeId, meetingId }) {
  const meeting = await Meeting.findOne({ _id: meetingId, organization: organizationId })
  if (!meeting) throw ApiError.notFound('Meeting not found.')
  if (String(meeting.organizer) !== employeeId) {
    throw ApiError.forbidden('Only the meeting organizer can start this meeting.')
  }
  if (meeting.status === 'active') return meeting
  if (['ended', 'cancelled'].includes(meeting.status)) {
    throw ApiError.validation('This meeting has already ended.')
  }

  const existingActive = await Meeting.findOne({
    organization: organizationId,
    organizer: employeeId,
    status: 'active',
    _id: { $ne: meeting._id },
  })
  if (existingActive) {
    throw ApiError.conflict('You already have an active meeting. End it before starting another.')
  }

  const now = new Date()
  meeting.status = 'active'
  meeting.actualStartedAt = now
  meeting.expectedDuration = meeting.durationMin || 0
  meeting.expectedEndAt = new Date(now.getTime() + (meeting.durationMin || 0) * 60_000)
  await meeting.save()
  return meeting
}

export async function endMeeting({ organizationId, employeeId, meetingId }) {
  const meeting = await Meeting.findOne({ _id: meetingId, organization: organizationId })
  if (!meeting) throw ApiError.notFound('Meeting not found.')
  if (String(meeting.organizer) !== employeeId) {
    throw ApiError.forbidden('Only the meeting organizer can end this meeting.')
  }
  if (meeting.status !== 'active') {
    throw ApiError.validation('This meeting is not active.')
  }

  const now = new Date()
  meeting.status = 'ended'
  meeting.actualEndedAt = now
  meeting.actualDuration = meeting.actualStartedAt
    ? Math.max(0, Math.round((now.getTime() - meeting.actualStartedAt.getTime()) / 1000))
    : 0
  await meeting.save()
  return meeting
}

export async function calendarEvents({ organizationId, principal, month }) {
  const baseDate =
    typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)
      ? new Date(`${month}-01T00:00:00.000Z`)
      : new Date()
  const { start, end } = monthRange(baseDate)

  let taskFilter
  let queryFilter

  if (principal.role === 'admin') {
    taskFilter = { organization: organizationId, dueDate: { $gte: start, $lt: end } }
    queryFilter = { organization: organizationId, createdAt: { $gte: start, $lt: end } }
  } else if (principal.role === 'manager') {
    const team = await Employee.find({
      organization: organizationId,
      manager: principal.employeeId,
      'job.isActive': true,
    })
      .select('_id')
      .lean()
    const ids = team.map((member) => member._id)

    taskFilter = { organization: organizationId, assignedBy: principal.employeeId }
    if (ids.length) {
      taskFilter.dueDate = { $gte: start, $lt: end }
      queryFilter = {
        organization: organizationId,
        employee: { $in: ids },
        createdAt: { $gte: start, $lt: end },
      }
    } else {
      taskFilter.dueDate = { $lt: new Date(0) }
      queryFilter = { organization: organizationId, employee: { $in: [] } }
    }
  } else {
    taskFilter = {
      organization: organizationId,
      assignedTo: principal.employeeId,
      dueDate: { $gte: start, $lt: end },
    }
    queryFilter = {
      organization: organizationId,
      employee: principal.employeeId,
      createdAt: { $gte: start, $lt: end },
    }
  }

  const [meetings, tasks, queries] = await Promise.all([
    Meeting.find({
      organization: organizationId,
      participants: principal.employeeId,
      startTime: { $gte: start, $lt: end },
    })
      .select('title startTime status')
      .sort({ startTime: 1 })
      .lean(),
    Task.find(taskFilter)
      .select('title dueDate status')
      .sort({ dueDate: 1 })
      .lean(),
    EmployeeQuery.find(queryFilter)
      .select('message status createdAt')
      .sort({ createdAt: 1 })
      .lean(),
  ])

  return [
    ...meetings.map((meeting) => ({
      id: String(meeting._id),
      type: 'meeting',
      title: meeting.title,
      date: dateKey(meeting.startTime),
      status: meeting.status,
    })),
    ...tasks
      .filter((task) => task.dueDate)
      .map((task) => ({
        id: String(task._id),
        type: 'task',
        title: task.title,
        date: dateKey(task.dueDate),
        status: task.status,
      })),
    ...queries.map((query) => ({
      id: String(query._id),
      type: 'query',
      title:
        query.message.length > 40 ? `${query.message.slice(0, 37)}...` : query.message,
      date: dateKey(query.createdAt),
      status: query.status,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))
}

export async function listColleagues({ organizationId, principal, self }) {
  const filter = { organization: organizationId, 'job.isActive': true }

  if (principal.role === 'admin') {
    filter._id = { $ne: self._id }
  } else if (self.manager) {
    filter.$or = [{ manager: self.manager }, { _id: self.manager }]
  } else {
    filter._id = { $ne: self._id }
  }

  const colleagues = await Employee.find(filter)
    .select('firstName lastName employeeCode department designation role manager')
    .sort({ firstName: 1 })
    .lean()

  const availability = await availabilityMapFor(
    organizationId,
    colleagues.map((person) => String(person._id)),
  )

  return colleagues
    .filter((person) => String(person._id) !== String(self._id))
    .map((person) => ({
      ...person,
      isManager: String(person._id) === String(self.manager),
      availability: availability[String(person._id)] ?? {
        status: 'available',
        expectedEndAt: null,
      },
    }))
}

export const MAX_ACTIVE_MEETINGS = MAX_ACTIVE_MEETINGS_PER_ORGANIZER
