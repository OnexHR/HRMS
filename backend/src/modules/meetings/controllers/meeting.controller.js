import { sendCreated, sendData } from '../../../lib/response.js'
import {
  calendarEvents,
  createMeeting,
  endMeeting,
  getActiveMeeting,
  listColleagues,
  listMeetings,
  startMeeting,
} from '../services/meeting.service.js'

export async function handleMyMeetings(req, res) {
  const meetings = await listMeetings({
    organizationId: req.principal.organizationId,
    employeeId: req.principal.employeeId,
    upcoming: req.query.upcoming,
  })
  return sendData(res, { meetings })
}

export async function handleGetActiveMeeting(req, res) {
  const meeting = await getActiveMeeting(
    req.principal.organizationId,
    req.principal.employeeId,
  )
  return sendData(res, { meeting: meeting ?? null })
}

export async function handleCreateMeeting(req, res) {
  const meeting = await createMeeting({
    organizationId: req.principal.organizationId,
    organizer: req.principal,
    body: req.body ?? {},
  })
  return sendCreated(res, { meeting })
}

export async function handleStartMeeting(req, res) {
  const meeting = await startMeeting({
    organizationId: req.principal.organizationId,
    employeeId: req.principal.employeeId,
    meetingId: req.params.id,
  })
  return sendData(res, { meeting })
}

export async function handleEndMeeting(req, res) {
  const meeting = await endMeeting({
    organizationId: req.principal.organizationId,
    employeeId: req.principal.employeeId,
    meetingId: req.params.id,
  })
  return sendData(res, { meeting })
}

export async function handleCalendarEvents(req, res) {
  const events = await calendarEvents({
    organizationId: req.principal.organizationId,
    principal: req.principal,
    month: req.query.month,
  })
  return sendData(res, { events })
}

export async function handleListColleagues(req, res) {
  const colleagues = await listColleagues({
    organizationId: req.principal.organizationId,
    principal: req.principal,
    self: req.employee,
  })
  return sendData(res, { colleagues })
}
