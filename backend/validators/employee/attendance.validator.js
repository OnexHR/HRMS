import { badRequest } from "./util.validator.js";
import {
  HALF_DAY_CHECKIN_MINUTES,
  HALF_DAY_CHECKOUT_MINUTES,
  LATE_AFTER_MINUTES,
  LATE_GRACE_MINUTES,
  LATE_NIGHT_CHECKIN_MINUTES,
  MAX_BREAK_MINUTES,
  OVERTIME_END_MINUTES,
  OVERTIME_START_MINUTES,
  SHIFT_START_MINUTES,
} from "./attendance.constants.js";

// Re-exported so existing imports from this module keep working; the single
// source of truth is attendance.constants.js.
export {
  HALF_DAY_CHECKIN_MINUTES,
  HALF_DAY_CHECKOUT_MINUTES,
  LATE_AFTER_MINUTES,
  LATE_GRACE_MINUTES,
  LATE_NIGHT_CHECKIN_MINUTES,
  MAX_BREAK_MINUTES,
  OVERTIME_END_MINUTES,
  OVERTIME_START_MINUTES,
  SHIFT_START_MINUTES,
};

const STANDARD_DAY_MINUTES = Number(process.env.EMPLOYEE_STANDARD_DAY_MINUTES) || 540;

export function standardDayMinutes() {
  return STANDARD_DAY_MINUTES;
}

export function maxBreakMinutes() {
  return MAX_BREAK_MINUTES;
}

// Minutes from midnight when the shift is expected to start.
export function shiftStartMinutes() {
  return SHIFT_START_MINUTES;
}

export function lateGraceMinutes() {
  return LATE_GRACE_MINUTES;
}

// How many minutes past the shift start the check-in happened. Returns 0 when the
// check-in is missing or still inside the grace window, so callers can treat a
// non-zero result as "late".
export function minutesLate(checkIn, dayStart = new Date()) {
  if (!checkIn) return 0;
  const expected = startOfDay(dayStart).getTime() + SHIFT_START_MINUTES * 60000;
  const late = Math.round((new Date(checkIn).getTime() - expected) / 60000);
  return late > LATE_GRACE_MINUTES ? late : 0;
}

// Full/half-day aware count of weekdays between two inclusive dates.
// (Weekend handling can be toggled later via a holiday config.)
export function countLeaveDays(from, to, dayType = "full_day") {
  const start = startOfDay(from);
  const end = startOfDay(to);
  if (end < start) throw badRequest("toDate must be on or after fromDate.");

  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  if (days === 0) throw badRequest("No working days in the requested range.");
  return dayType === "full_day" ? days : 0.5;
}

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date) {
  const d = new Date(startOfDay(date));
  d.setDate(d.getDate() + 1);
  return d;
}

export function monthRange(date = new Date()) {
  const start = startOfDay(new Date(date));
  start.setDate(1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
}

export function minutesBetween(from, to) {
  if (!from || !to) return 0;
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return diff > 0 ? Math.round(diff / 60000) : 0;
}

export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
}