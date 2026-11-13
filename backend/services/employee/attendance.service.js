import Attendance from "../../models/employee/Attendance.js";
import LeaveRequest from "../../models/employee/LeaveRequest.js";
import Meeting from "../../models/employee/Meeting.js";
import {
  endOfDay,
  maxBreakMinutes,
  minutesBetween,
  minutesLate,
  monthRange,
  standardDayMinutes,
  startOfDay,
} from "../../validators/employee/attendance.validator.js";
import {
  HALF_DAY_CHECKIN_MINUTES,
  HALF_DAY_CHECKOUT_MINUTES,
  LATE_AFTER_MINUTES,
  LATE_NIGHT_CHECKIN_MINUTES,
  MAX_BREAK_MINUTES,
  OVERTIME_END_MINUTES,
  OVERTIME_START_MINUTES,
  kolkataDayStart,
  kolkataMinutesOfDay,
} from "../../validators/employee/attendance.constants.js";
import { conflict, badRequest } from "../../validators/employee/util.validator.js";
import { logActivity } from "./activity.service.js";

// Pure day-status computation, evaluated in the spec's order. All times are
// Asia/Kolkata minutes-of-day. Returns one of:
//   "present" | "late" | "half_day" | "leave" | "absent"
// "on_break" is intentionally NOT returned here: it is a live overlay only and
// must never overwrite the day's final status.
export function computeDayStatus({ hasCheckIn, checkInMin, checkOutMin, hasLeave }) {
  // 1. No check-in + approved leave covers the day -> Leave
  // 2. No check-in + no leave -> Absent
  if (!hasCheckIn) return hasLeave ? "leave" : "absent";
  // 3. Approved leave + any check-in at/after 13:00 -> Leave (overtime still
  //    counted). A check-in before 13:00 on a leave day is blocked at check-in
  //    time, so any recorded check-in on a leave day is treated as Leave.
  if (hasLeave) return "leave";
  // 4. No approved leave + check-in >= 18:00 -> Absent (overtime counted)
  if (checkInMin >= LATE_NIGHT_CHECKIN_MINUTES) return "absent";
  // 5. check-in in [13:00, 18:00), OR check-out < 14:00 -> Half Day
  const halfByCheckIn =
    checkInMin >= HALF_DAY_CHECKIN_MINUTES && checkInMin < LATE_NIGHT_CHECKIN_MINUTES;
  const halfByCheckOut =
    checkOutMin !== null && checkOutMin !== undefined && checkOutMin < HALF_DAY_CHECKOUT_MINUTES;
  if (halfByCheckIn || halfByCheckOut) return "half_day";
  // 6. check-in > 09:45 and < 13:00 -> Late
  if (checkInMin > LATE_AFTER_MINUTES && checkInMin < HALF_DAY_CHECKIN_MINUTES) return "late";
  // 7. Otherwise -> Present
  return "present";
}

// Live status for the "today" views. While a session is open (no check-out)
// the live status is Present or Late; "On Break" is an overlay that never
// overwrites the final day status. Half Day by early check-out is decided at
// check-out, so it never appears as a live status.
export function liveStatusFor({ isOpen, onBreak, checkInMin }) {
  if (!isOpen) return null;
  if (onBreak) return "on_break";
  if (checkInMin > LATE_AFTER_MINUTES && checkInMin < HALF_DAY_CHECKIN_MINUTES) return "late";
  return "present";
}

// The day's sessions: the stored sessions array, falling back to the derived
// single [checkIn, checkOut] pair for records written before sessions existed.
function sessionsOf(record) {
  if (Array.isArray(record.sessions) && record.sessions.length) return record.sessions;
  return [{ checkIn: record.checkIn, checkOut: record.checkOut }];
}

// Real worked minutes for a closed day: sum over all sessions of (duration)
// minus breaks, whatever the day status. Minutes are floored.
export function workingMinutesFor(record) {
  if (!record) return 0;
  let total = 0;
  for (const s of sessionsOf(record)) {
    if (s.checkIn && s.checkOut) {
      const ms = new Date(s.checkOut).getTime() - new Date(s.checkIn).getTime();
      if (ms > 0) total += Math.floor(ms / 60000);
    }
  }
  return Math.max(0, total - Math.floor(record.breakMinutes || 0));
}

export async function getAttendance(employeeId, date = new Date()) {
  const dayStart = startOfDay(date);
  return Attendance.findOne({ employee: employeeId, date: dayStart });
}

export async function approvedLeaveOn(employeeId, date = new Date()) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  return LeaveRequest.findOne({
    employee: employeeId,
    status: "approved",
    fromDate: { $lte: dayEnd },
    toDate: { $gte: dayStart },
  })
    .select("leaveType fromDate toDate")
    .lean();
}

const leaveTypeLabel = (leaveType) => {
  if (leaveType === "unpaid") return "unpaid leave";
  if (leaveType === "sick") return "sick leave";
  return leaveType ? `${leaveType} leave` : "approved leave";
};

// The session a check-out should close, plus whether the record carried it only
// in its top-level checkIn/checkOut pair (a record written before the sessions
// array existed). Returns null when nothing is open: the record is already
// checked out, or its state cannot be interpreted safely and must not be
// invented.
function resolveOpenSession(record) {
  const sessions = Array.isArray(record.sessions) ? record.sessions : [];
  const open = sessions.find((s) => s.checkIn && !s.checkOut);
  if (open) return { checkIn: open.checkIn, legacy: false };
  // Safe legacy repair: the top level clearly says "checked in" (check-in set,
  // no check-out) and there are no sessions at all, so the top-level pair IS
  // the day's single session and can be rebuilt as one.
  if (record.checkIn && !record.checkOut && sessions.length === 0) {
    return { checkIn: record.checkIn, legacy: true };
  }
  return null;
}

// Pure check-in plan for an existing record. Returns null when the record is
// already open — via a session, or at the top level only for a legacy record —
// so a repeated check-in can never open a second session. Otherwise returns the
// atomic filter (re-asserting "still not open" at write time, so a concurrent
// check-in loses the race and reports the same conflict) and the fields that
// keep the top-level checkIn/checkOut consistent with the sessions.
export function planCheckIn(record, now = new Date(), hasLeave = false) {
  const sessions = (record.sessions || []).map((s) => ({ checkIn: s.checkIn, checkOut: s.checkOut }));
  // Multiple sessions per day are allowed: block only when one is open...
  if (sessions.some((s) => s.checkIn && !s.checkOut)) return null;
  // ...or when the top level itself still reads as checked in (legacy record).
  if (record.checkIn && !record.checkOut) return null;

  sessions.push({ checkIn: now, checkOut: null });
  return {
    filter: {
      sessions: { $not: { $elemMatch: { checkIn: { $ne: null }, checkOut: null } } },
      $or: [{ checkIn: null }, { checkOut: { $ne: null } }],
    },
    update: {
      $set: {
        sessions,
        // A new open session means the day is no longer checked out; leaving a
        // stale top-level check-out in place would hide the session from the
        // "today" views and from getOpenAttendance().
        checkOut: null,
        // Derived first-check-in for backward compatibility.
        ...(record.checkIn ? {} : { checkIn: now }),
        workingMinutes: 0,
        overtimeMinutes: 0,
        // Live status while open: Present or Late (never "on_break" as a final status).
        status: computeDayStatus({
          hasCheckIn: true,
          checkInMin: kolkataMinutesOfDay(now.getTime()),
          checkOutMin: null,
          hasLeave,
        }),
      },
    },
  };
}

export async function checkIn(employeeId) {
  const today = startOfDay(new Date());
  const now = new Date();

  // An approved leave covering today means the day is already accounted for.
  // Checking in BEFORE 13:00 is blocked with a clear message (the day stays
  // Leave); checking in at/after 13:00 is allowed and the day is still Leave,
  // with overtime counted if the employee works past 18:00.
  const leave = await approvedLeaveOn(employeeId);
  if (leave) {
    const nowMin = kolkataMinutesOfDay(now.getTime());
    if (nowMin < HALF_DAY_CHECKIN_MINUTES) {
      throw conflict(
        `You are on approved ${leaveTypeLabel(leave.leaveType)} today, so check-in is not allowed before 1:00 PM. You may check in at or after 1:00 PM, or contact your manager if this is a mistake.`
      );
    }
  }

  const existing = await Attendance.findOne({ employee: employeeId, date: today });
  let record;
  if (existing) {
    const plan = planCheckIn(existing, now, Boolean(leave));
    if (!plan) throw conflict("Already checked in.");
    // The filter is applied at write time, so a concurrent check-in that
    // opened a session between the read and this update fails instead of
    // pushing a duplicate open session.
    record = await Attendance.findOneAndUpdate(
      { _id: existing._id, ...plan.filter },
      plan.update,
      { new: true },
    );
    if (!record) throw conflict("Already checked in.");
  } else {
    record = new Attendance({
      employee: employeeId,
      date: today,
      status: computeDayStatus({
        hasCheckIn: true,
        checkInMin: kolkataMinutesOfDay(now.getTime()),
        checkOutMin: null,
        hasLeave: Boolean(leave),
      }),
      sessions: [{ checkIn: now, checkOut: null }],
      // Derived first-check-in for backward compatibility.
      checkIn: now,
      checkOut: null,
      breakMinutes: 0,
      workingMinutes: 0,
      overtimeMinutes: 0,
    });
    try {
      await record.save();
    } catch (err) {
      // Two first-ever check-ins racing: the unique {employee, date} index lets
      // exactly one win, and the loser reports the same conflict as any other
      // duplicate check-in instead of creating a second record.
      if (err?.code === 11000 || err?.cause?.code === 11000) throw conflict("Already checked in.");
      throw err;
    }
  }
  await logActivity(employeeId, "checkin", { at: now });
  return record;
}

export async function breakStart(employeeId) {
  const record = await requireTodayRecord(employeeId);
  if (record.breakStart) throw conflict("Break already in progress.");
  record.breakStart = new Date();
  record.breakEnd = null;
  // "On Break" is a live overlay only; it must not overwrite the day's final
  // status, so the persisted status is left as the current day status.
  await record.save();
  await logActivity(employeeId, "break_start", { at: record.breakStart });
  return record;
}

export async function breakEnd(employeeId) {
  const record = await requireTodayRecord(employeeId);
  if (!record.breakStart) throw badRequest("No break in progress.");
  const startedAt = new Date(record.breakStart);
  const endedAt = new Date();
  // Max break 60 min: a break that reached 60 min auto-ends, so the recorded
  // interval is capped at 60 minutes and the working clock resumes.
  const autoEnd = new Date(startedAt.getTime() + MAX_BREAK_MINUTES * 60000);
  const effectiveEnd = endedAt.getTime() > autoEnd.getTime() ? autoEnd : endedAt;
  const minutes = Math.max(0, Math.floor((effectiveEnd.getTime() - startedAt.getTime()) / 60000));
  record.breaks = record.breaks || [];
  record.breaks.push({ start: startedAt, end: effectiveEnd });
  record.breakEnd = effectiveEnd;
  record.breakMinutes = (record.breakMinutes || 0) + minutes;
  record.breakStart = null;
  record.breakEnd = null;
  recomputeHours(record);
  await record.save();
  await logActivity(employeeId, "break_end", { minutes });
  return record;
}

// Pure check-out plan: closes the open session (rebuilding it first when the
// record is a legacy top-level-only one), keeps the top-level check-out in sync,
// recomputes the working/overtime totals and decides the final day status.
// Returns null when nothing is open, so a repeated or racing check-out fails
// with the existing message instead of overwriting valid history.
export function planCheckOut(record, now = new Date()) {
  const open = resolveOpenSession(record);
  if (!open) return null;

  const sessions = (record.sessions || []).map((s) => ({ checkIn: s.checkIn, checkOut: s.checkOut }));
  if (open.legacy) sessions.push({ checkIn: record.checkIn, checkOut: null });
  const target = sessions.find((s) => s.checkIn && !s.checkOut);
  target.checkOut = now;

  const state = {
    sessions,
    breaks: record.breaks || [],
    breakStart: record.breakStart || null,
    breakMinutes: record.breakMinutes || 0,
    checkIn: record.checkIn,
    checkOut: now,
  };
  recomputeHours(state);

  return {
    legacy: open.legacy,
    sessionCheckIn: target.checkIn,
    fields: {
      sessions,
      // Derived last-check-out for backward compatibility.
      checkOut: now,
      workingMinutes: state.workingMinutes,
      overtimeMinutes: state.overtimeMinutes,
      // Final day status is decided at check-out (Half Day by early check-out
      // is only knowable now).
      status: computeDayStatus({
        hasCheckIn: true,
        checkInMin: kolkataMinutesOfDay(new Date(record.checkIn).getTime()),
        checkOutMin: kolkataMinutesOfDay(now.getTime()),
        hasLeave: false,
      }),
    },
  };
}

export async function checkOut(employeeId) {
  const record = await requireTodayRecord(employeeId);
  if (record.breakStart) throw badRequest("End your current break before checking out.");
  const now = new Date();
  const plan = planCheckOut(record, now);
  if (!plan) throw badRequest("No open session to check out.");

  // Close atomically against the state the plan was built from: a second (or
  // concurrent) check-out matches nothing and gets the same message instead of
  // double-writing the record. The legacy filter additionally requires the
  // record to still be open only at the top level with no sessions, so the
  // repair can never overwrite a record that has real session data.
  const filter = plan.legacy
    ? {
        _id: record._id,
        checkIn: record.checkIn,
        checkOut: null,
        sessions: { $not: { $elemMatch: { checkIn: { $ne: null } } } },
      }
    : {
        _id: record._id,
        sessions: { $elemMatch: { checkIn: plan.sessionCheckIn, checkOut: null } },
      };
  const updated = await Attendance.findOneAndUpdate(filter, { $set: plan.fields }, { new: true });
  if (!updated) throw badRequest("No open session to check out.");

  // Auto-end any active meetings the employee is running.
  await autoEndActiveMeetings(employeeId);
  await logActivity(employeeId, "checkout", { at: now });
  return updated;
}

// Overtime is counted inside two Asia/Kolkata windows: 18:00-24:00 on the
// check-in day, and 00:00-09:00 of a later day (only reachable when the employee
// is still checked in past midnight; it stops at 09:00 and keeps the value).
// Before 18:00 on the check-in day overtime is 0. Working hours are unaffected
// by these windows.

// Overlap in minutes between [from, to] and [winStart, winEnd], treating a missing
// end as "still running" (clamped to now by the caller).
function overlapMinutes(from, to, winStart, winEnd) {
  const start = Math.max(new Date(from).getTime(), winStart);
  const end = Math.min(new Date(to).getTime(), winEnd);
  return end > start ? (end - start) / 60000 : 0;
}

// The overtime windows (epoch ms) that can overlap a session [checkIn, end]. The
// check-in day contributes only its 18:00-24:00 window; every later day contributes
// both its 00:00-09:00 and 18:00-24:00 windows. A session that ends before midnight
// simply has no overlap with the next day's early window. If check-in is after
// 18:00, the overlap naturally starts at the check-in time.
function overtimeWindows(checkIn, end) {
  const windows = [];
  const firstDay = kolkataDayStart(checkIn);
  const lastDay = kolkataDayStart(end);
  for (let dayStart = firstDay; dayStart <= lastDay; dayStart += 24 * 60 * 60000) {
    const isCheckInDay = dayStart === firstDay;
    const evening = dayStart + OVERTIME_START_MINUTES * 60000;
    const midnight = dayStart + 24 * 60 * 60000;
    windows.push({ start: evening, end: midnight });
    // The 00:00-09:00 window belongs to the day AFTER the check-in day.
    if (!isCheckInDay) {
      const morning = dayStart + OVERTIME_END_MINUTES * 60000;
      windows.push({ start: dayStart, end: morning });
    }
  }
  return windows;
}

// All break intervals that pause the working/overtime clocks: completed breaks
// (record.breaks) plus the in-progress break, which auto-ends at 60 minutes.
function breakIntervals(record, endMs) {
  const intervals = (record.breaks || []).map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));
  if (record.breakStart) {
    const bs = new Date(record.breakStart).getTime();
    const autoEnd = bs + MAX_BREAK_MINUTES * 60000;
    const be = Math.min(endMs, autoEnd);
    if (be > bs) intervals.push({ start: bs, end: be });
  }
  return intervals;
}

// Overtime minutes for a record's sessions up to `end` (defaults to now for an
// open record), minus the break minutes that fell inside the overtime windows.
// Applies to Present, Late, Half Day, Leave and Absent days; it does not require
// a 540-minute day.
export function overtimeMinutesFor(record, end) {
  if (!record) return 0;
  const effectiveEnd = end ? new Date(end).getTime() : Date.now();
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

export function recomputeHours(record) {
  // Real worked time: sum over all sessions of (duration) minus breaks.
  record.workingMinutes = workingMinutesFor(record);
  // Persist the window-based overtime once the session is closed; an open record
  // keeps 0 until check-out (the live value is derived separately).
  record.overtimeMinutes = record.checkOut ? overtimeMinutesFor(record, record.checkOut) : 0;
  return record;
}

// Timezone-independent date key (YYYY-MM-DD) so the frontend calendar can
// match days regardless of server/browser timezone differences.
/**
 * @param {Date} d
 * @returns {string}
 */
function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function monthlyAttendance(employeeId, date = new Date()) {
  const { start, end } = monthRange(date);
  const [records, leaves] = await Promise.all([
    Attendance.find({ employee: employeeId, date: { $gte: start, $lt: end } }).lean(),
    LeaveRequest.find({
      employee: employeeId,
      status: { $in: ["approved", "pending"] },
      fromDate: { $lt: end },
      toDate: { $gte: start },
    }).lean(),
  ]);

  const dayMap = {};
  const leaveByType = new Map();
  for (const leave of leaves) {
    if (leave.status !== "approved") continue;
    const cursor = startOfDay(Math.max(start.getTime(), new Date(leave.fromDate).getTime()));
    const last = startOfDay(Math.min(new Date(leave.toDate).getTime(), end.getTime() - 1));
    while (cursor <= last) {
      leaveByType.set(dateKey(cursor), leave.leaveType);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  for (const rec of records) {
    const key = dateKey(rec.date);
    const hasLeave = leaveByType.has(key);
    const hasCheckIn = Boolean(rec.checkIn);
    const checkInMin = hasCheckIn ? kolkataMinutesOfDay(new Date(rec.checkIn).getTime()) : null;
    const checkOutMin = rec.checkOut ? kolkataMinutesOfDay(new Date(rec.checkOut).getTime()) : null;

    // Real worked time: sum over all sessions minus breaks (live while open).
    let workingMinutes = rec.workingMinutes || 0;
    if (rec.checkIn && !rec.checkOut) {
      workingMinutes = liveWorkingMinutes(rec);
    }

    // Overtime is persisted on check-out; an open session shows its live total.
    const overtimeMinutes = rec.checkIn && !rec.checkOut ? liveOvertimeMinutes(rec) : rec.overtimeMinutes;

    const status = computeDayStatus({ hasCheckIn, checkInMin, checkOutMin, hasLeave });

    dayMap[key] = {
      status,
      date: key,
      checkIn: rec.checkIn,
      checkOut: rec.checkOut,
      workingHours: `${Math.floor(workingMinutes / 60)}h ${workingMinutes % 60}m`,
      breakTime: `${Math.floor(rec.breakMinutes / 60)}h ${rec.breakMinutes % 60}m`,
      overtime: overtimeMinutes > 0 ? `${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m` : null,
      tasksCompleted: rec.tasksCompleted,
      leaveType: hasLeave ? leaveByType.get(key) : undefined,
    };
  }

  // Leave days without any attendance record.
  for (const [key, leaveType] of leaveByType) {
    if (!dayMap[key]) {
      dayMap[key] = { status: "Leave", date: key, leaveType };
    }
  }

  return {
    month: startOfDay(date).toISOString(),
    dayMap,
    records: records.map((r) => ({ ...r, date: startOfDay(r.date).toISOString() })),
    summary: summarizeRecords(records),
  };
}

export async function summaryForRange(employeeId, from, to) {
  const f = startOfDay(from);
  const t = endOfDay(to);
  if (t <= f) throw badRequest("Range is invalid.");

  // Sum the range with a $group aggregation so the database does the totalling
  // instead of loading every record. A malformed record contributes 0 rather
  // than throwing, so one bad document cannot break the dashboard.
  const [agg] = await Attendance.aggregate([
    { $match: { employee: employeeId, date: { $gte: f, $lt: t } } },
    {
      $group: {
        _id: null,
        totalWorkingMinutes: { $sum: { $ifNull: ["$workingMinutes", 0] } },
        totalOvertimeMinutes: { $sum: { $ifNull: ["$overtimeMinutes", 0] } },
        totalBreakMinutes: { $sum: { $ifNull: ["$breakMinutes", 0] } },
      },
    },
  ]);

  // Fetch records and leaves to compute presentDays correctly
  // (Present/Late/Half Day only; Leave and Absent are NOT counted).
  const [records, leaves, tasksCompleted, open] = await Promise.all([
    Attendance.find({ employee: employeeId, date: { $gte: f, $lt: t } }).lean(),
    LeaveRequest.find({
      employee: employeeId,
      status: "approved",
      fromDate: { $lt: t },
      toDate: { $gte: f },
    }).lean(),
    import("../../models/employee/Task.js").then(({ default: Task }) =>
      Task.countDocuments({
        assignedTo: employeeId,
        status: "Completed",
        completedAt: { $gte: f, $lt: t },
      }),
    ),
    getOpenAttendance(employeeId),
  ]);

  const leaveDays = new Set();
  for (const leave of leaves) {
    const cursor = startOfDay(Math.max(f.getTime(), new Date(leave.fromDate).getTime()));
    const last = startOfDay(Math.min(new Date(leave.toDate).getTime(), t.getTime() - 1));
    while (cursor <= last) {
      leaveDays.add(localDateKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  // Compute presentDays: count of days in range with status Present, Late, or Half Day.
  // Build a map of attendance records by day key.
  const recByDay = new Map();
  for (const rec of records) {
    recByDay.set(localDateKey(rec.date), rec);
  }
  let presentDays = 0;
  for (const [key, rec] of recByDay) {
    const hasLeave = leaveDays.has(key);
    const hasCheckIn = Boolean(rec.checkIn);
    const checkInMin = hasCheckIn ? kolkataMinutesOfDay(new Date(rec.checkIn).getTime()) : null;
    const checkOutMin = rec.checkOut ? kolkataMinutesOfDay(new Date(rec.checkOut).getTime()) : null;
    const status = computeDayStatus({ hasCheckIn, checkInMin, checkOutMin, hasLeave });
    if (status === "present" || status === "late" || status === "half_day") presentDays++;
  }
  // Leave and Absent days (even with overtime) are NOT counted in presentDays.

  // An open record's working/overtime minutes are only persisted on check-out, so
  // add its live totals to keep today's running time out of the sum.
  let liveWorking = 0;
  let liveOvertime = 0;
  if (open && open.date.getTime() >= f.getTime() && open.date.getTime() < t.getTime()) {
    liveWorking = liveWorkingMinutes(open);
    liveOvertime = liveOvertimeMinutes(open);
  }

  return {
    startDate: f,
    endDate: t,
    totalWorkingMinutes: (agg?.totalWorkingMinutes || 0) + liveWorking,
    totalOvertimeMinutes: (agg?.totalOvertimeMinutes || 0) + liveOvertime,
    presentDays,
    // Reported separately from presentDays so a range summary can show that the
    // gap was approved leave rather than an unexplained absence.
    leaveDays: leaveDays.size,
    tasksCompleted,
    totalBreakMinutes: agg?.totalBreakMinutes || 0,
  };
}

function summarizeRecords(records) {
  const totalWorking = records.reduce((s, r) => s + (r.workingMinutes || 0), 0);
  const totalBreak = records.reduce((s, r) => s + (r.breakMinutes || 0), 0);
  const totalOvertime = records.reduce((s, r) => s + (r.overtimeMinutes || 0), 0);
  return {
    totalWorkingMinutes: totalWorking,
    totalBreakMinutes: totalBreak,
    totalOvertimeMinutes: totalOvertime,
  };
}

async function requireTodayRecord(employeeId) {
  const today = startOfDay(new Date());
  let record = await Attendance.findOne({ employee: employeeId, date: today });
  // Still on the clock from a previous day: keep acting on that open record.
  // Not lean — check-out/break actions save it, which a plain object cannot.
  if (!record) record = await getOpenAttendance(employeeId, { lean: false });
  if (!record) throw badRequest("Check in before using this action.");
  return record;
}

// Which meetings count as live right now: started, not finished, and not
// cancelled or ended. A null endTime means it runs until closed out.
export function liveMeetingFilter(employeeIds, now = new Date()) {
  return {
    participants: { $in: employeeIds },
    status: { $in: ["scheduled", "active"] },
    startTime: { $lte: now },
    $or: [{ endTime: null }, { endTime: { $gt: now } }],
  };
}

// Live meetings for a set of members, with participant names populated so the
// manager's "on call" popup can say who is meeting with whom.
async function fetchLiveMeetings(employeeIds, now = new Date()) {
  if (!employeeIds.length) return [];

  return Meeting.find(liveMeetingFilter(employeeIds, now))
    .populate("participants", "firstName lastName")
    .select("title participants")
    .lean();
}

// Participants in a meeting that is running right now, so a manager can see who
// is on a call.
export async function ongoingMeetingParticipantIds(employeeIds, now = new Date()) {
  const meetings = await fetchLiveMeetings(employeeIds, now);
  return new Set(
    meetings.flatMap((meeting) => (meeting.participants || []).map((p) => String(p._id))),
  );
}

// Auto-end any active meetings for an employee (e.g. on checkout).
export async function autoEndActiveMeetings(employeeId) {
  const active = await Meeting.find({
    organizer: employeeId,
    status: "active",
  });
  const now = new Date();
  for (const meeting of active) {
    meeting.status = "ended";
    meeting.actualEndedAt = now;
    meeting.actualDuration = meeting.actualStartedAt
      ? Math.max(0, Math.round((now.getTime() - meeting.actualStartedAt.getTime()) / 1000))
      : 0;
    await meeting.save();
  }
  return active.length;
}

// Pure: what a member's Activity cell should say right now. Activity is about
// being reachable at this moment, not about having an attendance record for the
// day, so a member who checked in and already checked out is Offline again.
export function deriveActivity({ onLeave, onBreak, onCall, checkIn, checkOut }) {
  if (onLeave) return "Offline";
  if (onBreak) return "Break";
  if (onCall) return "On Call";
  if (!checkIn || checkOut) return "Offline";
  return "Online";
}

// Pure aggregation: given live meetings with populated participant names, build
// the member id -> { titles, partners } map used by the on-call popup. Kept
// standalone so the grouping rules are unit-testable without a database.
export function aggregateMeetingPartners(meetings) {
  const byMember = new Map();

  for (const meeting of meetings) {
    const participants = meeting.participants || [];
    const names = participants.map((p) => `${p.firstName} ${p.lastName}`);

    participants.forEach((participant, i) => {
      const entry = byMember.get(String(participant._id)) ?? { titles: [], partners: new Map() };
      if (meeting.title && !entry.titles.includes(meeting.title)) entry.titles.push(meeting.title);
      names.forEach((name, j) => {
        if (j !== i) entry.partners.set(name, true);
      });
      byMember.set(String(participant._id), entry);
    });
  }

  return byMember;
}

// Map of member id -> { titles, partners } for everyone in a live meeting. The
// partner list names the other meeting participants, and the title is the first
// meeting they are in, so the popup reads e.g. "In Sprint Sync with A, B".
export async function onCallMeetingPartners(employeeIds, now = new Date()) {
  return aggregateMeetingPartners(await fetchLiveMeetings(employeeIds, now));
}

export async function teamAttendanceToday(managerId, date = new Date()) {
  return loadTeamAttendanceToday(managerId, date);
}

// Summary cards only (manager dashboard "Today's Attendance").
export async function teamAttendanceStats(managerId, date = new Date()) {
  const { date: day, stats } = await loadTeamAttendanceToday(managerId, date);
  return { date: day, stats };
}

// Per-member table rows only (manager dashboard "Today's Team Attendance").
export async function teamAttendanceRows(managerId, date = new Date()) {
  const { date: day, rows } = await loadTeamAttendanceToday(managerId, date);
  return { date: day, rows };
}

async function loadTeamAttendanceToday(managerId, date = new Date()) {
  const Employee = (await import("../../models/employee/Employee.js")).default;
  const today = startOfDay(date);
  const todayEnd = endOfDay(today);
  const now = new Date();
  const team = await Employee.find({ manager: managerId, "job.isActive": true })
    .select("firstName lastName employeeCode department role")
    .lean();
  const ids = team.map((m) => m._id);

  let records = [];
  let leaves = [];
  if (ids.length) {
    [records, leaves] = await Promise.all([
      Attendance.find({ employee: { $in: ids }, date: today }).lean(),
      LeaveRequest.find({
        employee: { $in: ids },
        status: "approved",
        fromDate: { $lt: todayEnd },
        toDate: { $gte: today },
      }).lean(),
    ]);
  }
  const onLeaveIds = new Set(leaves.map((l) => String(l.employee)));
  const onCallPartners = await onCallMeetingPartners(ids, now);
  const onCallIds = new Set(onCallPartners.keys());

  const rows = team.map((member) => {
    const rec = records.find((r) => String(r.employee) === String(member._id));
    const onLeave = onLeaveIds.has(String(member._id));
    const late = rec ? minutesLate(rec.checkIn, today) : 0;
    const status = onLeave
      ? "Leave"
      : rec
        ? rec.breakStart
          ? "Break"
          : rec.status === "absent"
            ? "Absent"
            : late > 0
              ? "Late"
              : "Present"
        : "Absent";
    return {
      _id: member._id,
      name: `${member.firstName} ${member.lastName}`,
      employeeCode: member.employeeCode,
      department: member.department,
      role: member.role,
      attendance: status,
      activity: deriveActivity({
        onLeave,
        onBreak: Boolean(rec?.breakStart),
        onCall: onCallIds.has(String(member._id)),
        checkIn: rec?.checkIn,
        checkOut: rec?.checkOut,
      }),
      checkIn: rec?.checkIn || null,
      checkOut: rec?.checkOut || null,
      workingMinutes: liveWorkingMinutes(rec, now),
      breakMinutes: (rec?.breakMinutes || 0) + (rec?.breakStart ? minutesBetween(rec.breakStart, now) : 0),
      lateMinutes: late,
    };
  });

  const total = rows.length;
  const count = (label) => rows.filter((r) => r.attendance === label).length;
  const present = count("Present");
  const late = count("Late");
  const absent = count("Absent");
  const onLeave = count("Leave");
  const onBreakRows = rows.filter((r) => r.activity === "Break");
  const onCallRows = rows.filter((r) => r.activity === "On Call");
  // Same rule as the abuse alert: a member is abnormal when they are late or
  // have spent more than twice the allowed break allowance. Members on approved
  // leave are excluded outright - the day is accounted for, so neither lateness
  // nor break time on it should count against them.
  const abnormalRows = rows.filter(
    (r) => r.attendance !== "Leave" && (r.lateMinutes > 0 || r.breakMinutes > maxBreakMinutes() * 2),
  );
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  // The membership lists ride along so the click-through "who is this?" popup
  // on the manager dashboard stays derived in one place instead of being
  // re-guessed on the client.
  const members = (list) => list.map((m) => m.name);

  return {
    date: today,
    stats: {
      total,
      present,
      late,
      absent,
      presentPct: pct(present),
      latePct: pct(late),
      absentPct: pct(absent),
      onLeave,
      onLeavePct: pct(onLeave),
      onBreak: onBreakRows.length,
      onBreakPct: pct(onBreakRows.length),
      onCall: onCallRows.length,
      onCallPct: pct(onCallRows.length),
      abnormal: abnormalRows.length,
      abnormalPct: pct(abnormalRows.length),
      onBreakNames: members(onBreakRows),
      onCallNames: members(onCallRows),
      abnormalNames: members(abnormalRows),
      // Per on-call member: which meeting they are in and who else is in it.
      onCallMeetings: onCallRows.map((row) => {
        const info = onCallPartners.get(String(row._id));
        return {
          name: row.name,
          title: info?.titles[0] ?? null,
          with: info ? [...info.partners].join(", ") : "",
        };
      }),
    },
    rows,
  };
}

// Working minutes for a member who has not checked out yet are only persisted on
// checkout, so derive them live for anyone still on the clock. Sums over all
// sessions; the in-progress break pauses the clock and a break that reached
// 60 min auto-ends so the clock resumes.
export function liveWorkingMinutes(record, now = new Date()) {
  if (!record) return 0;
  const nowMs = now.getTime();
  let total = 0;
  for (const s of sessionsOf(record)) {
    const ci = new Date(s.checkIn).getTime();
    if (Number.isNaN(ci)) continue;
    const co = s.checkOut ? new Date(s.checkOut).getTime() : nowMs;
    if (co > ci) total += Math.floor((co - ci) / 60000);
  }
  let breakTime = Math.floor(record.breakMinutes || 0);
  if (record.breakStart) {
    const bs = new Date(record.breakStart).getTime();
    const autoEnd = bs + MAX_BREAK_MINUTES * 60000;
    const be = Math.min(nowMs, autoEnd);
    if (be > bs) breakTime += Math.floor((be - bs) / 60000);
  }
  return Math.max(0, total - breakTime);
}

// Live overtime for a record that is still open: the window-based total up to now,
// pausing at an in-progress break exactly like the working-minutes clock does.
export function liveOvertimeMinutes(record, now = new Date()) {
  if (!record?.checkIn || record.checkOut) return record?.overtimeMinutes || 0;
  return overtimeMinutesFor(record, now);
}

// The employee's open attendance record (checked in, not checked out), if any. A
// session that runs past midnight keeps this record, so check-out / break actions
// and the "today" views keep working on it instead of an empty new-day record.
// Read paths get the lean form; mutation paths pass { lean: false } to receive a
// document they can save.
export async function getOpenAttendance(employeeId, { lean = true } = {}) {
  const query = Attendance.findOne({ employee: employeeId, checkIn: { $ne: null }, checkOut: null })
    .sort({ checkIn: -1 });
  return lean ? query.lean() : query;
}

export async function teamAttendanceMonth(managerId, date = new Date()) {
  const Employee = (await import("../../models/employee/Employee.js")).default;
  const { start, end } = monthRange(date);
  const team = await Employee.find({ manager: managerId, "job.isActive": true })
    .select("firstName lastName employeeCode department")
    .lean();
  const ids = team.map((m) => m._id);
  const records = ids.length
    ? await Attendance.find({ employee: { $in: ids }, date: { $gte: start, $lt: end } }).lean()
    : [];

  return { start, end, team, records };
}

const isWeekday = (d) => {
  const day = d.getDay();
  return day !== 0 && day !== 6;
};

// Local YYYY-MM-DD so the day labels survive timezone math; an ISO key would
// shift on the calendar for any locale east or west of UTC.
const localDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Pure per-member month report. Records are raw Attendance docs (one per worked
// day), leaves are approved leave requests overlapping the month. The status of
// a day is leave > absent > late > present, matching the manager dashboard rule
// where check-in time decides lateness rather than the stored status string.
export function buildMonthlyReport(member, records, leaves, { start, end }) {
  const leaveByDay = new Map();
  for (const leave of leaves) {
    const from = startOfDay(Math.max(start.getTime(), new Date(leave.fromDate).getTime()));
    const to = startOfDay(Math.min(new Date(leave.toDate).getTime(), end.getTime() - 1));
    const cursor = new Date(from);
    while (cursor <= to) {
      if (isWeekday(cursor)) leaveByDay.set(localDateKey(cursor), leave.leaveType || "full_day");
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const recordByDay = new Map();
  for (const rec of records) recordByDay.set(localDateKey(rec.date), rec);

  const present = [];
  const late = [];
  const absent = [];
  const onLeave = [];
  const days = [];

  const cursor = new Date(start);
  while (cursor < end) {
    if (isWeekday(cursor)) {
      const key = localDateKey(cursor);
      const leaveType = leaveByDay.get(key);
      const rec = recordByDay.get(key);

      if (leaveType) {
        onLeave.push({ date: key, status: "leave", leaveType });
      } else if (!rec || rec.status === "absent") {
        absent.push({ date: key, status: "absent" });
      } else if (minutesLate(rec.checkIn, cursor) > 0) {
        late.push({ date: key, status: "late" });
      } else {
        present.push({ date: key, status: "present" });
      }

      days.push(
        leaveType
          ? { date: key, status: "leave", leaveType }
          : rec && rec.status !== "absent"
            ? {
                date: key,
                status: minutesLate(rec.checkIn, cursor) > 0 ? "late" : "present",
                checkIn: rec.checkIn ?? null,
                checkOut: rec.checkOut ?? null,
                workingMinutes: rec.workingMinutes || 0,
                breakMinutes: rec.breakMinutes || 0,
                overtimeMinutes: rec.overtimeMinutes || 0,
              }
            : { date: key, status: "absent" },
      );
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const workingMinutes = days.reduce((total, day) => total + (day.workingMinutes || 0), 0);
  const breakMinutes = days.reduce((total, day) => total + (day.breakMinutes || 0), 0);
  const overtimeMinutes = days.reduce((total, day) => total + (day.overtimeMinutes || 0), 0);
  const expected = present.length + late.length + absent.length + onLeave.length;

  return {
    member: {
      _id: member._id,
      name: `${member.firstName} ${member.lastName}`,
      employeeCode: member.employeeCode,
      department: member.department,
    },
    summary: {
      present: present.length,
      late: late.length,
      absent: absent.length,
      onLeave: onLeave.length,
      workingMinutes,
      breakMinutes,
      overtimeMinutes,
      attendanceRate: expected > 0 ? Math.round(((present.length + late.length) / expected) * 100) : 0,
    },
    days,
  };
}

// Monthly report for every active team member: counts, hours, and a day-by-day
// breakdown, so the manager's "View Reports" page needs no further lookups.
export async function teamMonthlyReports(managerId, date = new Date()) {
  const Employee = (await import("../../models/employee/Employee.js")).default;
  const { start, end } = monthRange(date);
  const team = await Employee.find({ manager: managerId, "job.isActive": true })
    .select("firstName lastName employeeCode department")
    .sort("firstName lastName")
    .lean();
  const ids = team.map((m) => m._id);

  const [records, leaves] = ids.length
    ? await Promise.all([
        Attendance.find({ employee: { $in: ids }, date: { $gte: start, $lt: end } }).lean(),
        LeaveRequest.find({
          employee: { $in: ids },
          status: "approved",
          fromDate: { $lt: end },
          toDate: { $gte: start },
        }).lean(),
      ])
    : [[], []];

  const recordsByEmployee = new Map();
  for (const rec of records) {
    const list = recordsByEmployee.get(String(rec.employee)) ?? [];
    list.push(rec);
    recordsByEmployee.set(String(rec.employee), list);
  }
  const leavesByEmployee = new Map();
  for (const leave of leaves) {
    const list = leavesByEmployee.get(String(leave.employee)) ?? [];
    list.push(leave);
    leavesByEmployee.set(String(leave.employee), list);
  }

  const reports = team.map((member) =>
    buildMonthlyReport(
      member,
      recordsByEmployee.get(String(member._id)) ?? [],
      leavesByEmployee.get(String(member._id)) ?? [],
      { start, end },
    ),
  );

  return { date: start, end, reports };
}