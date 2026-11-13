/**
 * Leave day counting.
 *
 * Dates are calendar dates (`YYYY-MM-DD`) and are interpreted in UTC so the
 * result never depends on the server's local timezone. Weekends are excluded;
 * a future holiday calendar will be passed in explicitly.
 */

import { WORKING_WEEKDAYS } from '../constants/attendance.js'
import type { LeaveDayType } from '../constants/leave.js'

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Parses a strict calendar date, rejecting values like `2026-02-31`. */
function utcDateFromKey(value: string): Date | null {
  if (!DATE_KEY_PATTERN.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  return date
}

function isWorkingDate(date: Date, workingWeekdays: readonly number[]): boolean {
  return workingWeekdays.includes(date.getUTCDay())
}

/** True when the calendar date falls on a configured working weekday. */
export function isWorkingDay(
  date: string,
  workingWeekdays: readonly number[] = WORKING_WEEKDAYS,
): boolean {
  const parsed = utcDateFromKey(date)
  return parsed !== null && isWorkingDate(parsed, workingWeekdays)
}

/** Inclusive working dates in a range, as `YYYY-MM-DD` strings. */
export function eachWorkingDate(
  fromDate: string,
  toDate: string,
  workingWeekdays: readonly number[] = WORKING_WEEKDAYS,
): string[] {
  const from = utcDateFromKey(fromDate)
  const to = utcDateFromKey(toDate)
  if (!from || !to || to.getTime() < from.getTime()) return []

  const dates: string[] = []
  const cursor = new Date(from)
  while (cursor <= to) {
    if (isWorkingDate(cursor, workingWeekdays)) dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

/**
 * Correct day count for a leave request.
 *
 * - A half day is only valid for one working date and counts as `0.5`.
 * - A half day on a weekend/holiday counts as `0`, never `0.5` (M1/B5).
 * - A multi-date half-day is invalid and counts as `0`; the schema rejects it.
 * - Full-day ranges count only working weekdays.
 * - Invalid or inverted ranges count as `0`.
 *
 * The schema is responsible for turning a zero-day request into a validation
 * error; this function stays total so callers can use it for previews.
 */
export function countLeaveDays(
  fromDate: string,
  toDate: string,
  dayType: LeaveDayType = 'full_day',
  workingWeekdays: readonly number[] = WORKING_WEEKDAYS,
): number {
  const from = utcDateFromKey(fromDate)
  const to = utcDateFromKey(toDate)
  if (!from || !to || to.getTime() < from.getTime()) return 0

  if (dayType !== 'full_day') {
    if (from.getTime() !== to.getTime()) return 0
    return isWorkingDate(from, workingWeekdays) ? 0.5 : 0
  }

  return eachWorkingDate(fromDate, toDate, workingWeekdays).length
}
