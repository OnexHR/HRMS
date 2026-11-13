/**
 * Employee lifecycle vocabulary and formatting rules.
 */

export const EMPLOYMENT_STATUSES = [
  "active",
  "on_leave",
  "terminated",
  "inactive",
] as const;

export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  active: "Active",
  on_leave: "On Leave",
  terminated: "Terminated",
  inactive: "Inactive",
};

export const DEFAULT_EMPLOYMENT_STATUS: EmploymentStatus = "active";

/** Prefix and zero-padding for generated employee codes (`EMP001`). */
export const EMPLOYEE_CODE_PREFIX = "EMP";
export const EMPLOYEE_CODE_PAD = 3;

export const MAX_NAME_LENGTH = 80;
export const MAX_PHONE_LENGTH = 20;
export const MAX_DESIGNATION_LENGTH = 120;
export const MAX_ADDRESS_LENGTH = 300;
export const MAX_BIO_LENGTH = 500;
export const MAX_SKILL_LENGTH = 40;
export const MAX_SKILLS = 20;

export const ACTIVITY_TYPES = [
  "checkin",
  "checkout",
  "break_start",
  "break_end",
  "meeting_created",
  "meeting_start",
  "meeting_end",
  "meeting_cancelled",
  "task_assigned",
  "task_status_changed",
  "task_completed",
  "leave_submitted",
  "leave_cancelled",
  "leave_approved",
  "leave_rejected",
  "query_raised",
  "query_reviewed",
  "profile_updated",
  "employee_created",
  "employee_updated",
  "employee_deactivated",
  "employee_deleted",
  "balance_adjusted",
  "file_uploaded",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  checkin: "Checked in",
  checkout: "Checked out",
  break_start: "Break started",
  break_end: "Break ended",
  meeting_created: "Meeting scheduled",
  meeting_start: "Meeting started",
  meeting_end: "Meeting ended",
  meeting_cancelled: "Meeting cancelled",
  task_assigned: "Task assigned",
  task_status_changed: "Task status changed",
  task_completed: "Task completed",
  leave_submitted: "Leave requested",
  leave_cancelled: "Leave cancelled",
  leave_approved: "Leave approved",
  leave_rejected: "Leave rejected",
  query_raised: "Query raised",
  query_reviewed: "Query reviewed",
  profile_updated: "Profile updated",
  employee_created: "Employee created",
  employee_updated: "Employee updated",
  employee_deactivated: "Employee deactivated",
  employee_deleted: "Employee deleted",
  balance_adjusted: "Leave balance adjusted",
  file_uploaded: "File uploaded",
};
