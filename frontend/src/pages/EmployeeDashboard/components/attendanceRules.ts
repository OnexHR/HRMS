import moment from "moment-timezone";

// All attendance time-of-day rules are evaluated in Asia/Kolkata wall-clock,
// never in the browser's own timezone. Stored minutes use Math.floor consistently.
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

// Minutes since Asia/Kolkata midnight for the given instant (float, so rule
// boundaries like "after 09:45" stay precise).
export function kolkataMinutesOfDay(ms: number): number {
  const m = moment(ms).tz(ATTENDANCE_TIMEZONE);
  return m.hours() * 60 + m.minutes() + m.seconds() / 60;
}

// Epoch ms of the Asia/Kolkata midnight that starts the day containing `ms`.
export function kolkataDayStart(ms: number): number {
  return moment(ms).tz(ATTENDANCE_TIMEZONE).startOf("day").valueOf();
}

// Epoch ms of the Asia/Kolkata midnight that starts the day AFTER the day
// containing `ms` (used for the post-midnight overtime window).
export function kolkataNextDayStart(ms: number): number {
  return kolkataDayStart(ms) + 24 * 60 * MINUTE_MS;
}

// --- Types ---

export type DayStatus = "present" | "late" | "half_day" | "leave" | "absent";
export type LiveStatus = DayStatus | "on_break";

export interface AttendanceRecord {
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakMinutes: number;
  workingMinutes: number;
  overtimeMinutes: number;
  sessions?: { checkIn: string; checkOut: string | null }[];
  breaks?: { start: string; end: string }[];
  status?: string;
}

export interface LeaveRecord {
  leaveType: string;
  fromDate: string;
  toDate: string;
  status: string;
}

// --- Core rule functions ---

// Pure day-status computation, evaluated in the spec's order. All times are
// Asia/Kolkata minutes-of-day. Returns one of:
//   "present" | "late" | "half_day" | "leave" | "absent"
// "on_break" is intentionally NOT returned here: it is a live overlay only and
// must never overwrite the day's final status.
export function computeDayStatus(params: {
  hasCheckIn: boolean;
  checkInMin: number | null;
  checkOutMin: number | null;
  hasLeave: boolean;
}): DayStatus {
  const { hasCheckIn, checkInMin, checkOutMin, hasLeave } = params;

  // 1. No check-in + approved leave covers the day -> Leave
  // 2. No check-in + no leave -> Absent
  if (!hasCheckIn) return hasLeave ? "leave" : "absent";

  // 3. Approved leave + any check-in at/after 13:00 -> Leave (overtime still
  //    counted). A check-in before 13:00 on a leave day is blocked at check-in
  //    time, so any recorded check-in on a leave day is treated as Leave.
  if (hasLeave) return "leave";

  // 4. No approved leave + check-in >= 18:00 -> Absent (overtime counted)
  if (checkInMin !== null && checkInMin >= LATE_NIGHT_CHECKIN_MINUTES) return "absent";

  // 5. check-in in [13:00, 18:00), OR check-out < 14:00 -> Half Day
  const halfByCheckIn =
    checkInMin !== null &&
    checkInMin >= HALF_DAY_CHECKIN_MINUTES &&
    checkInMin < LATE_NIGHT_CHECKIN_MINUTES;
  const halfByCheckOut =
    checkOutMin !== null && checkOutMin !== undefined && checkOutMin < HALF_DAY_CHECKOUT_MINUTES;
  if (halfByCheckIn || halfByCheckOut) return "half_day";

  // 6. check-in > 09:45 and < 13:00 -> Late
  if (checkInMin !== null && checkInMin > LATE_AFTER_MINUTES && checkInMin < HALF_DAY_CHECKIN_MINUTES)
    return "late";

  // 7. Otherwise -> Present
  return "present";
}

// Live status for the "today" views. While a session is open (no check-out)
// the live status is Present or Late; "On Break" is an overlay that never
// overwrites the final day status. Half Day by early check-out is decided at
// check-out, so it never appears as a live status.
export function computeLiveStatus(params: {
  isOpen: boolean;
  onBreak: boolean;
  checkInMin: number | null;
}): LiveStatus | null {
  const { isOpen, onBreak, checkInMin } = params;
  if (!isOpen) return null;
  if (onBreak) return "on_break";
  if (checkInMin !== null && checkInMin > LATE_AFTER_MINUTES && checkInMin < HALF_DAY_CHECKIN_MINUTES)
    return "late";
  return "present";
}

// The day's sessions: the stored sessions array, falling back to the derived
// single [checkIn, checkOut] pair for records written before sessions existed.
function sessionsOf(record: AttendanceRecord): { checkIn: string; checkOut: string | null }[] {
  if (Array.isArray(record.sessions) && record.sessions.length) return record.sessions;
  // record.checkIn may be null for old records without check-in
  return record.checkIn ? [{ checkIn: record.checkIn, checkOut: record.checkOut }] : [];
}

// All break intervals that pause the working/overtime clocks: completed breaks
// (record.breaks) plus the in-progress break, which auto-ends at 60 minutes.
function breakIntervals(record: AttendanceRecord, endMs: number): { start: number; end: number }[] {
  const intervals = (record.breaks || []).map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));
  if (record.breakStart) {
    const bs = new Date(record.breakStart).getTime();
    const autoEnd = bs + MAX_BREAK_MINUTES * MINUTE_MS;
    const be = Math.min(endMs, autoEnd);
    if (be > bs) intervals.push({ start: bs, end: be });
  }
  return intervals;
}

// Overlap in minutes between [from, to] and [winStart, winEnd], treating a missing
// end as "still running" (clamped to now by the caller).
function overlapMinutes(from: number, to: number, winStart: number, winEnd: number): number {
  const start = Math.max(from, winStart);
  const end = Math.min(to, winEnd);
  return end > start ? (end - start) / MINUTE_MS : 0;
}

// The overtime windows (epoch ms) that can overlap a session [checkIn, end]. The
// check-in day contributes only its 18:00-24:00 window; every later day contributes
// both its 00:00-09:00 and 18:00-24:00 windows. A session that ends before midnight
// simply has no overlap with the next day's early window. If check-in is after
// 18:00, the overlap naturally starts at the check-in time.
function overtimeWindows(checkIn: number, end: number): { start: number; end: number }[] {
  const windows: { start: number; end: number }[] = [];
  const firstDay = kolkataDayStart(checkIn);
  const lastDay = kolkataDayStart(end);
  for (let dayStart = firstDay; dayStart <= lastDay; dayStart += 24 * 60 * MINUTE_MS) {
    const isCheckInDay = dayStart === firstDay;
    const evening = dayStart + OVERTIME_START_MINUTES * MINUTE_MS;
    const midnight = dayStart + 24 * 60 * MINUTE_MS;
    windows.push({ start: evening, end: midnight });
    // The 00:00-09:00 window belongs to the day AFTER the check-in day.
    if (!isCheckInDay) {
      const morning = dayStart + OVERTIME_END_MINUTES * MINUTE_MS;
      windows.push({ start: dayStart, end: morning });
    }
  }
  return windows;
}

// Real worked minutes for a closed day: sum over all sessions of (duration)
// minus breaks, whatever the day status. Minutes are floored.
export function computeWorkingMinutes(record: AttendanceRecord): number {
  if (!record) return 0;
  let total = 0;
  for (const s of sessionsOf(record)) {
    if (s.checkIn && s.checkOut) {
      const ms = new Date(s.checkOut).getTime() - new Date(s.checkIn).getTime();
      if (ms > 0) total += Math.floor(ms / MINUTE_MS);
    }
  }
  return Math.max(0, total - Math.floor(record.breakMinutes || 0));
}

// Live working minutes for a record that is still open (sums over all sessions;
// in-progress break pauses the clock and auto-ends at 60 min).
// Returns FRACTIONAL minutes so the UI's seconds display (formatRunningTime) ticks.
export function computeLiveWorkingMinutes(record: AttendanceRecord, nowMs: number): number {
  if (!record) return 0;
  let total = 0;
  for (const s of sessionsOf(record)) {
    const ci = new Date(s.checkIn).getTime();
    if (Number.isNaN(ci)) continue;
    const co = s.checkOut ? new Date(s.checkOut).getTime() : nowMs;
    if (co > ci) total += (co - ci) / MINUTE_MS; // fractional minutes for live display
  }
  let breakTime = record.breakMinutes || 0;
  if (record.breakStart) {
    const bs = new Date(record.breakStart).getTime();
    const autoEnd = bs + MAX_BREAK_MINUTES * MINUTE_MS;
    const be = Math.min(nowMs, autoEnd);
    if (be > bs) breakTime += (be - bs) / MINUTE_MS; // fractional
  }
  return Math.max(0, total - breakTime);
}

// Overtime minutes for a record's sessions up to `endMs` (defaults to now for an
// open record), minus the break minutes that fell inside the overtime windows.
// Applies to Present, Late, Half Day, Leave and Absent days; it does not require
// a 540-minute day.
export function computeOvertimeMinutes(record: AttendanceRecord, endMs?: number): number {
  if (!record) return 0;
  const effectiveEnd = endMs ?? Date.now();
  const intervals = breakIntervals(record, effectiveEnd);
  let total = 0;
  for (const s of sessionsOf(record)) {
    const ci = new Date(s.checkIn).getTime();
    if (Number.isNaN(ci)) continue;
    const co = s.checkOut ? new Date(s.checkOut).getTime() : effectiveEnd;
    if (co <= ci) continue;
    const windows = overtimeWindows(ci, co);
    for (const win of windows) {
      total += overlapMinutes(ci, co, win.start, win.end);
    }
    // Subtract the break time that fell inside this session's windows.
    for (const b of intervals) {
      for (const win of windows) {
        total -= overlapMinutes(b.start, b.end, win.start, win.end);
      }
    }
  }
  return Math.max(0, Math.floor(total));
}

// Live overtime for a record that is still open.
// Returns FRACTIONAL minutes so the UI's seconds display ticks.
export function computeLiveOvertimeMinutes(record: AttendanceRecord, nowMs: number): number {
  if (!record?.checkIn || record.checkOut) return record?.overtimeMinutes ?? 0;
  // computeOvertimeMinutes floors the result; re-compute live without flooring.
  const effectiveEnd = nowMs;
  const intervals = breakIntervals(record, effectiveEnd);
  let total = 0;
  for (const s of sessionsOf(record)) {
    const ci = new Date(s.checkIn).getTime();
    if (Number.isNaN(ci)) continue;
    const co = s.checkOut ? new Date(s.checkOut).getTime() : effectiveEnd;
    if (co <= ci) continue;
    const windows = overtimeWindows(ci, co);
    for (const win of windows) {
      total += overlapMinutes(ci, co, win.start, win.end);
    }
    for (const b of intervals) {
      for (const win of windows) {
        total -= overlapMinutes(b.start, b.end, win.start, win.end);
      }
    }
  }
  return Math.max(0, total); // fractional minutes
}

// --- UI helpers ---

// Human-readable combined status label, e.g. "Leave + Overtime".
export function statusLabel(dayStatus: DayStatus, overtimeMinutes: number): string {
  const base = dayStatus
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  if (overtimeMinutes > 0) return `${base} + Overtime`;
  return base;
}

// Status color mapping used by Today's Attendance, calendar dot, selected-date
// panel, and Work Summary so they can never disagree.
export function statusColor(dayStatus: DayStatus): {
  dot: string;
  ring: string;
  text: string;
  badge: string;
} {
  switch (dayStatus) {
    case "present":
      return { dot: "bg-green-400", ring: "border-green-300 bg-white", text: "text-green-600", badge: "bg-green-50 text-green-600" };
    case "late":
      return { dot: "bg-green-400", ring: "border-green-300 bg-white", text: "text-green-600", badge: "bg-green-50 text-green-600" };
    case "half_day":
      return { dot: "bg-yellow-400", ring: "border-yellow-300 bg-white", text: "text-yellow-500", badge: "bg-yellow-50 text-yellow-600" };
    case "leave":
      return { dot: "bg-blue-500", ring: "border-blue-300 bg-white", text: "text-blue-600", badge: "bg-blue-50 text-blue-600" };
    default: // absent
      return { dot: "bg-red-400", ring: "border-red-300 bg-white", text: "text-red-500", badge: "bg-red-50 text-red-600" };
  }
}

// Format minutes as "Hh Mm" (floored).
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.floor(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
}

// Format minutes as "Hh Mm Ss" (floored) for live ticking.
export function formatRunningTime(minutes: number): string {
  const totalSeconds = Math.max(0, Math.floor(minutes * 60));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${h}h ${pad(m)}m ${pad(s)}s`;
}

// Format ISO time string to locale time "HH:MM".
export function formatTime(value: string | null | undefined): string {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Build a local YYYY-MM-DD key so the frontend calendar matches the backend.
export function localDateKey(date: Date | number): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Check if a day has an approved leave covering it.
export function hasApprovedLeaveOn(dayKey: string, leaves: LeaveRecord[]): boolean {
  const day = new Date(dayKey + "T00:00:00");
  const dayStart = kolkataDayStart(day.getTime());
  const dayEnd = dayStart + 24 * 60 * MINUTE_MS;
  for (const leave of leaves) {
    if (leave.status !== "approved") continue;
    const from = new Date(leave.fromDate).getTime();
    const to = new Date(leave.toDate).getTime() + 24 * 60 * MINUTE_MS; // end of toDate
    if (from <= dayEnd && to >= dayStart) return true;
  }
  return false;
}

// Find leave type for a day (if approved leave covers it).
export function leaveTypeForDay(dayKey: string, leaves: LeaveRecord[]): string | undefined {
  const day = new Date(dayKey + "T00:00:00");
  const dayStart = kolkataDayStart(day.getTime());
  const dayEnd = dayStart + 24 * 60 * MINUTE_MS;
  for (const leave of leaves) {
    if (leave.status !== "approved") continue;
    const from = new Date(leave.fromDate).getTime();
    const to = new Date(leave.toDate).getTime() + 24 * 60 * MINUTE_MS;
    if (from <= dayEnd && to >= dayStart) return leave.leaveType;
  }
  return undefined;
}