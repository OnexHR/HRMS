import type { AttendanceToday } from "../../../types/Employee";
import {
  computeLiveWorkingMinutes as coreLiveWorking,
  computeLiveOvertimeMinutes as coreLiveOvertime,
} from "./attendanceRules";

// Overtime starts ticking at this local hour (18 = 6 PM).
// Past midnight it keeps running only until this local hour (9 = 9 AM), then stops.
// These constants are now shared in attendanceRules.ts (OVERTIME_START_MINUTES, OVERTIME_END_MINUTES).

// Live working time, mirroring the server's liveWorkingMinutes(): persisted once
// checked out, otherwise measured from check-in with completed breaks deducted and
// an in-progress break acting as the end of the window so the clock pauses.
export function computeLiveWorkingMinutes(
  attendanceToday: AttendanceToday | null | undefined,
  now: number,
): number {
  return coreLiveWorking(attendanceToday as any, now);
}

// Live overtime: 6 PM to midnight, then 12 AM to 9 AM if still checked in. It resets
// at midnight and restarts from 12 AM. From 9 AM it stops ticking and keeps the value
// it reached; at 6 PM a fresh count starts. Working hours are separate and never
// stop. It pauses during a break.
export function computeOvertime(
  attendanceToday: AttendanceToday | null | undefined,
  now: number,
): { minutes: number; ticking: boolean } {
  const minutes = coreLiveOvertime(attendanceToday as any, now);
  const persisted = attendanceToday?.overtimeMinutes ?? 0;
  const checkedIn = Boolean(attendanceToday?.checkIn && !attendanceToday?.checkOut);
  if (!checkedIn) return { minutes: persisted, ticking: false };
  // Ticking while the window is open and no break is paused.
  const ticking = minutes > 0 && !attendanceToday?.breakStart;
  return { minutes, ticking };
}
