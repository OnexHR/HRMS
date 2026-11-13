/**
 * Meeting vocabulary.
 *
 * Decision 7 (locked): user-supplied links only. There is no provider
 * integration and no generated meeting URL, so `meetingLink` is optional.
 */

export const MEETING_STATUSES = ['scheduled', 'active', 'ended', 'cancelled'] as const
export type MeetingStatus = (typeof MEETING_STATUSES)[number]

export const DEFAULT_MEETING_STATUS: MeetingStatus = 'scheduled'

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  ended: 'Ended',
  cancelled: 'Cancelled',
}

/** Duration presets offered in the scheduling dialog. */
export const MEETING_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const
export type MeetingDurationOption = (typeof MEETING_DURATION_OPTIONS)[number]

export const MIN_MEETING_DURATION_MINUTES = 5
export const MAX_MEETING_DURATION_MINUTES = 480

export const MAX_MEETING_TITLE_LENGTH = 120
export const MAX_MEETING_PARTICIPANTS = 50
export const MAX_MEETING_LINK_LENGTH = 2048

/** An organization member may only have one meeting running at a time. */
export const MAX_ACTIVE_MEETINGS_PER_ORGANIZER = 1

export function isMeetingStatus(value: unknown): value is MeetingStatus {
  return typeof value === 'string' && (MEETING_STATUSES as readonly string[]).includes(value)
}
