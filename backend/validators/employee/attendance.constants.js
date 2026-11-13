import moment from "moment-timezone";

// All attendance time-of-day rules are evaluated in Asia/Kolkata wall-clock,
// never in the server's own timezone (which may be UTC). Stored minutes
// (working / overtime / break) use Math.floor consistently on server and UI.
export const ATTENDANCE_TIMEZONE = "Asia/Kolkata";

// Shift start 09:30, late grace 15 min -> Present up to 09:45.
export const SHIFT_START_MINUTES = 9 * 60 + 30; // 570
export const LATE_GRACE_MINUTES = 15;
export const LATE_AFTER_MINUTES = SHIFT_START_MINUTES + LATE_GRACE_MINUTES; // 585 = 09:45

// Half Day: check-in at/after 13:00, or check-out before 14:00.
export const HALF_DAY_CHECKIN_MINUTES = 13 * 60; // 780
export const HALF_DAY_CHECKOUT_MINUTES = 14 * 60; // 840

// Late-night cutoff: check-in at/after 18:00.
export const LATE_NIGHT_CHECKIN_MINUTES = 18 * 60; // 1080

// Overtime windows: 18:00-24:00 on the check-in day; 00:00-09:00 only while
// still checked in past midnight (stops at 09:00, value kept).
export const OVERTIME_START_MINUTES = 18 * 60; // 1080 = 18:00 (6 PM)
export const OVERTIME_END_MINUTES = 9 * 60; // 540 = 09:00

// Max break 60 min: when a break reaches 60 min it auto-ends so the working
// clock resumes.
export const MAX_BREAK_MINUTES = 60;

const MINUTE_MS = 60000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Minutes since Asia/Kolkata midnight for the given instant (float, so rule
// boundaries like "after 09:45" stay precise).
export function kolkataMinutesOfDay(ms) {
  const m = moment(ms).tz(ATTENDANCE_TIMEZONE);
  return m.hours() * 60 + m.minutes() + m.seconds() / 60;
}

// Epoch ms of the Asia/Kolkata midnight that starts the day containing `ms`.
export function kolkataDayStart(ms) {
  return moment(ms).tz(ATTENDANCE_TIMEZONE).startOf("day").valueOf();
}

// Epoch ms of the Asia/Kolkata midnight that starts the day AFTER the day
// containing `ms` (used for the post-midnight overtime window).
export function kolkataNextDayStart(ms) {
  return kolkataDayStart(ms) + DAY_MS;
}
