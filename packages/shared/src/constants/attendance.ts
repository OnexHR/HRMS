/**
 * Attendance vocabulary and Stage 1 policy constants.
 *
 * Stage 1 reproduces the donor behaviour in Asia/Kolkata (D6). The backend may
 * override the timezone and shift through environment variables; Stage 2
 * replaces these constants with a typed, organization-configurable policy.
 *
 * All time-of-day values are minutes from midnight in the attendance timezone.
 * They are plain numbers so both the backend and the frontend can use them
 * without a date library.
 */

export const ATTENDANCE_STATUSES = [
  'present',
  'absent',
  'late',
  'half_day',
  'leave',
  'on_break',
  'on_call',
] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  half_day: 'Half Day',
  leave: 'Leave',
  on_break: 'On Break',
  on_call: 'On Call',
}

/** Default organization timezone. */
export const ATTENDANCE_TIMEZONE = 'Asia/Kolkata'

/** Shift start 09:30. */
export const SHIFT_START_MINUTES = 9 * 60 + 30 // 570

/** Grace period after shift start: present until 09:45. */
export const LATE_GRACE_MINUTES = 15

/** Check-in after this is "late" (when not otherwise half day/absent). */
export const LATE_AFTER_MINUTES = SHIFT_START_MINUTES + LATE_GRACE_MINUTES // 585

/** A check-in at/after 13:00 counts as a half day. */
export const HALF_DAY_CHECKIN_MINUTES = 13 * 60 // 780

/** A check-out before 14:00 counts as a half day. */
export const HALF_DAY_CHECKOUT_MINUTES = 14 * 60 // 840

/** A check-in at/after 18:00 with no approved leave counts as absent. */
export const LATE_NIGHT_CHECKIN_MINUTES = 18 * 60 // 1080

/** Overtime window opens at 18:00 on the check-in day. */
export const OVERTIME_START_MINUTES = 18 * 60 // 1080

/** Overtime window closes at 09:00 the following morning. */
export const OVERTIME_END_MINUTES = 9 * 60 // 540

/** Maximum unpaid break per day before it is auto-ended. */
export const MAX_BREAK_MINUTES = 60

/** Standard working day used for utilisation calculations. */
export const STANDARD_DAY_MINUTES = 9 * 60 // 540

export const MINUTES_PER_DAY = 24 * 60
export const MINUTES_PER_HOUR = 60

/** Monday–Friday. 0 = Sunday. */
export const WORKING_WEEKDAYS = [1, 2, 3, 4, 5] as const

export type WorkingWeekday = (typeof WORKING_WEEKDAYS)[number]

export const MAX_ATTENDANCE_NOTE_LENGTH = 200
