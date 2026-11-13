/**
 * Attendance time and status math, shared by the backend and the frontend.
 *
 * All time-of-day rules are evaluated in the attendance timezone (Asia/Kolkata
 * in Stage 1), never in the host's local timezone. The implementation uses
 * `Intl.DateTimeFormat`, so it works in Node and the browser without moment or
 * a date library.
 */

import {
  ATTENDANCE_TIMEZONE,
  HALF_DAY_CHECKIN_MINUTES,
  HALF_DAY_CHECKOUT_MINUTES,
  LATE_AFTER_MINUTES,
  LATE_NIGHT_CHECKIN_MINUTES,
} from '../constants/attendance.js'
import type { AttendanceStatus } from '../constants/attendance.js'

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

export type DateInput = Date | string | number

interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const existing = formatters.get(timeZone)
  if (existing) return existing
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  formatters.set(timeZone, formatter)
  return formatter
}

function zonedParts(ms: number, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(new Date(ms))
  const values: Record<string, number> = {}
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour % 24,
    minute: values.minute,
    second: values.second,
  }
}

/** Offset of `timeZone` at the given instant, in milliseconds east of UTC. */
function timeZoneOffsetMs(ms: number, timeZone: string): number {
  const parts = zonedParts(ms, timeZone)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return Math.round((asUtc - ms) / MINUTE_MS) * MINUTE_MS
}

function toMs(value: DateInput): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

/**
 * Minutes since local midnight, with a fractional part for seconds. Boundaries
 * such as "after 09:45" therefore stay precise.
 */
export function kolkataMinutesOfDay(
  value: DateInput,
  timeZone: string = ATTENDANCE_TIMEZONE,
): number {
  const parts = zonedParts(toMs(value), timeZone)
  return parts.hour * 60 + parts.minute + parts.second / 60
}

/**
 * Epoch milliseconds of the local midnight that starts the day containing
 * `value`. India has no daylight saving, so day boundaries are stable.
 */
export function kolkataDayStart(value: DateInput, timeZone: string = ATTENDANCE_TIMEZONE): number {
  const ms = toMs(value)
  const parts = zonedParts(ms, timeZone)
  const wallMidnight = Date.UTC(parts.year, parts.month - 1, parts.day)
  const noon = Date.UTC(parts.year, parts.month - 1, parts.day, 12)
  return wallMidnight - timeZoneOffsetMs(noon, timeZone)
}

/** Epoch milliseconds of the next local midnight (used for overtime windows). */
export function kolkataNextDayStart(
  value: DateInput,
  timeZone: string = ATTENDANCE_TIMEZONE,
): number {
  return kolkataDayStart(value, timeZone) + DAY_MS
}

/** Local calendar date as `YYYY-MM-DD`. */
export function kolkataDateKey(value: DateInput, timeZone: string = ATTENDANCE_TIMEZONE): string {
  const parts = zonedParts(toMs(value), timeZone)
  return [
    String(parts.year).padStart(4, '0'),
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-')
}

export interface DayStatusInput {
  hasCheckIn: boolean
  /** Minutes from local midnight; `null` when there is no check-in. */
  checkInMin: number | null
  /** Minutes from local midnight; `null` until the employee checks out. */
  checkOutMin: number | null
  hasLeave: boolean
}

/**
 * Final persisted day status, evaluated in the donor's order:
 *
 * 1. no check-in + approved leave -> leave
 * 2. no check-in + no leave -> absent
 * 3. approved leave -> leave
 * 4. check-in at/after 18:00 -> absent
 * 5. check-in in [13:00, 18:00) or check-out before 14:00 -> half_day
 * 6. check-in after 09:45 and before 13:00 -> late
 * 7. otherwise -> present
 *
 * `on_break` is a live overlay only and must never become the persisted status.
 */
export function computeDayStatus({
  hasCheckIn,
  checkInMin,
  checkOutMin,
  hasLeave,
}: DayStatusInput): AttendanceStatus {
  if (!hasCheckIn) return hasLeave ? 'leave' : 'absent'
  if (hasLeave) return 'leave'

  const checkIn = checkInMin ?? 0
  if (checkIn >= LATE_NIGHT_CHECKIN_MINUTES) return 'absent'

  const halfByCheckIn = checkIn >= HALF_DAY_CHECKIN_MINUTES && checkIn < LATE_NIGHT_CHECKIN_MINUTES
  const halfByCheckOut = checkOutMin !== null && checkOutMin < HALF_DAY_CHECKOUT_MINUTES
  if (halfByCheckIn || halfByCheckOut) return 'half_day'

  if (checkIn > LATE_AFTER_MINUTES && checkIn < HALF_DAY_CHECKIN_MINUTES) return 'late'
  return 'present'
}

export interface LiveStatusInput {
  isOpen: boolean
  onBreak: boolean
  checkInMin: number | null
}

/**
 * Live status for the "today" views. An open session is present or late; a
 * break is an overlay. Half day by early check-out is decided at check-out.
 * Returns `null` when the day is closed.
 */
export function liveStatusFor({
  isOpen,
  onBreak,
  checkInMin,
}: LiveStatusInput): AttendanceStatus | null {
  if (!isOpen) return null
  if (onBreak) return 'on_break'
  const checkIn = checkInMin ?? 0
  return checkIn > LATE_AFTER_MINUTES && checkIn < HALF_DAY_CHECKIN_MINUTES ? 'late' : 'present'
}

/** Positive whole minutes between two instants; `0` for missing/reversed input. */
export function minutesBetween(
  from: DateInput | null | undefined,
  to: DateInput | null | undefined,
): number {
  if (from === null || from === undefined || to === null || to === undefined) return 0
  const diff = toMs(to) - toMs(from)
  return diff > 0 ? Math.round(diff / MINUTE_MS) : 0
}
