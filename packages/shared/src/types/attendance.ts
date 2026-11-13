import type { AttendanceStatus } from "../constants/attendance.js";
import type { EntityId, ISODateString, Nullable } from "./api.js";
import type { EmployeeSummary } from "./employee.js";
import type { MeetingSummary } from "./meeting.js";

/**
 * Attendance shapes. A day may contain several sessions (check out then check
 * back in); working minutes are the sum of sessions minus breaks.
 */

export interface AttendanceSession {
  checkIn: ISODateString;
  checkOut: Nullable<ISODateString>;
}

export interface AttendanceBreak {
  start: ISODateString;
  end: Nullable<ISODateString>;
}

export interface AttendanceRecord {
  id: EntityId;
  organizationId: EntityId;
  employeeId: EntityId;
  date: ISODateString;
  status: AttendanceStatus;
  checkIn: Nullable<ISODateString>;
  checkOut: Nullable<ISODateString>;
  sessions: AttendanceSession[];
  breaks: AttendanceBreak[];
  breakMinutes: number;
  workingMinutes: number;
  overtimeMinutes: number;
  note: string;
  markedBy: Nullable<EntityId>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Live state for the current day, including in-progress break/meeting. */
export interface AttendanceToday {
  date: ISODateString;
  status: AttendanceStatus;
  checkIn: Nullable<ISODateString>;
  checkOut: Nullable<ISODateString>;
  isCheckedIn: boolean;
  isOnBreak: boolean;
  breakStartedAt: Nullable<ISODateString>;
  breakMinutes: number;
  workingMinutes: number;
  overtimeMinutes: number;
  sessions: AttendanceSession[];
  breaks: AttendanceBreak[];
  activeMeeting?: Nullable<MeetingSummary>;
}

export interface AttendanceMonthDay {
  date: ISODateString;
  status: AttendanceStatus;
  checkIn: Nullable<ISODateString>;
  checkOut: Nullable<ISODateString>;
  workingMinutes: number;
  overtimeMinutes: number;
}

export interface AttendanceRangeSummary {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  totalWorkingMinutes: number;
  totalOvertimeMinutes: number;
}

export interface AttendanceMonth {
  year: number;
  month: number;
  days: AttendanceMonthDay[];
  summary: AttendanceRangeSummary;
}

export interface TeamAttendanceRow extends AttendanceToday {
  employee: EmployeeSummary;
}

export interface TeamAttendanceStats {
  totalMembers: number;
  present: number;
  absent: number;
  late: number;
  onLeave: number;
  onBreak: number;
  onCall: number;
}

export interface TeamAttendance {
  date: ISODateString;
  stats: TeamAttendanceStats;
  rows: TeamAttendanceRow[];
}
