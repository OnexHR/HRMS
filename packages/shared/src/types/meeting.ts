import type { MeetingStatus } from '../constants/meeting.js'
import type { EntityId, ISODateString, Nullable } from './api.js'
import type { EmployeeSummary } from './employee.js'

/**
 * Meeting shapes.
 *
 * Decision 7 (locked): `meetingLink` is user-supplied and optional. Nothing in
 * this module implies a provider integration or a generated join URL.
 */

export interface MeetingSummary {
  id: EntityId
  title: string
  meetingLink: Nullable<string>
  startTime: ISODateString
  endTime: Nullable<ISODateString>
  durationMin: number
  status: MeetingStatus
}

export interface Meeting extends MeetingSummary {
  organizationId: EntityId
  organizerId: EntityId
  organizer?: EmployeeSummary
  participants: EmployeeSummary[]
  actualStartedAt: Nullable<ISODateString>
  actualEndedAt: Nullable<ISODateString>
  actualDuration: number
  expectedEndAt: Nullable<ISODateString>
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface MeetingAvailability {
  employee: EmployeeSummary
  isAvailable: boolean
  currentMeeting: Nullable<MeetingSummary>
}

export interface MeetingCreateInput {
  title: string
  meetingLink?: string | null
  participants: EntityId[]
  startTime: ISODateString
  durationMin: number
}

export type CalendarEventType = 'meeting' | 'task' | 'leave' | 'query'

export interface CalendarEvent {
  id: EntityId
  type: CalendarEventType
  title: string
  start: ISODateString
  end: Nullable<ISODateString>
  status: string
  meta?: Record<string, unknown>
}

export interface CalendarQuery {
  from: ISODateString
  to: ISODateString
}
