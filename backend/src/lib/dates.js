import {
  ATTENDANCE_TIMEZONE,
  LATE_GRACE_MINUTES,
  SHIFT_START_MINUTES,
  kolkataDateKey,
  kolkataDayStart,
  kolkataMinutesOfDay,
  minutesBetween as sharedMinutesBetween,
} from '@hrms/shared'

import { env } from '../config/env.js'

export const DAY_MS = 24 * 60 * 60 * 1000

export function timeZone() {
  return env.attendanceTimezone || ATTENDANCE_TIMEZONE
}

/** Epoch milliseconds of the start of the attendance-timezone day. */
export function dayStartMs(value = new Date()) {
  return kolkataDayStart(value, timeZone())
}

export function startOfDay(value = new Date()) {
  return new Date(dayStartMs(value))
}

export function endOfDay(value = new Date()) {
  return new Date(dayStartMs(value) + DAY_MS)
}

export function dateKey(value = new Date()) {
  return kolkataDateKey(value, timeZone())
}

/** Adds whole days without relying on the host timezone. */
export function addDays(value, days) {
  return new Date(new Date(value).getTime() + days * DAY_MS)
}

/**
 * Weekday index (0 = Sunday) for a `YYYY-MM-DD` key.
 *
 * Calendar keys must be interpreted in UTC; deriving the weekday from a
 * timezone-shifted `Date` would silently shift the day in negative-offset
 * zones.
 */
export function weekdayOfKey(key) {
  const date = parseDateKey(key)
  return date ? date.getUTCDay() : -1
}

/** True when the key falls on Monday-Friday. */
export function isWeekdayKey(key) {
  const day = weekdayOfKey(key)
  return day >= 1 && day <= 5
}

/**
 * Inclusive list of calendar keys between two keys.
 *
 * Used for leave/attendance day maps so iteration is independent of the
 * server's local timezone.
 */
export function dateKeysBetween(fromKey, toKey) {
  const from = parseDateKey(fromKey)
  const to = parseDateKey(toKey)
  if (!from || !to || to.getTime() < from.getTime()) return []

  const keys = []
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    keys.push(cursor.toISOString().slice(0, 10))
  }
  return keys
}

export function minutesBetween(from, to) {
  return sharedMinutesBetween(from, to)
}

/** Calendar month boundaries in the attendance timezone. */
export function monthRange(value = new Date()) {
  const key = dateKey(value)
  const [year, month] = key.split('-').map(Number)
  const startKey = `${year}-${String(month).padStart(2, '0')}-01`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const endKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  return {
    start: new Date(kolkataDayStart(new Date(`${startKey}T00:00:00.000Z`), timeZone())),
    end: new Date(kolkataDayStart(new Date(`${endKey}T00:00:00.000Z`), timeZone())),
  }
}

export function minutesOfDay(value) {
  return kolkataMinutesOfDay(value, timeZone())
}

/** Minutes past the shift start, ignoring the grace window. */
export function minutesLate(checkIn, day = new Date()) {
  if (!checkIn) return 0
  const expected = dayStartMs(day) + SHIFT_START_MINUTES * 60_000
  const late = Math.round((new Date(checkIn).getTime() - expected) / 60_000)
  return late > LATE_GRACE_MINUTES ? late : 0
}

export function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

/** Parses a strict `YYYY-MM-DD` calendar date into a UTC midnight Date. */
export function parseDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  return date
}

/** Accepts a Date, ISO timestamp or `YYYY-MM-DD`; returns null when invalid. */
export function parseDate(value) {
  if (value === undefined || value === null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return isValidDate(date) ? date : null
}

/** Inclusive day span, used for leave-range guards. */
export function spanDays(from, to) {
  const a = startOfDay(from).getTime()
  const b = startOfDay(to).getTime()
  return Math.round((b - a) / DAY_MS) + 1
}
