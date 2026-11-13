import type {
  AttendanceRangeSummary,
  AttendanceToday,
  TeamAttendance,
} from "./attendance.js";
import type { ActivityEntry, EmployeeSummary } from "./employee.js";
import type { LeaveBalance, LeaveRequest } from "./leave.js";
import type { Meeting } from "./meeting.js";
import type { EmployeeQueryRecord } from "./query.js";
import type { Task, TeamTaskSummary, TaskSummary } from "./task.js";
import type { EntityId, ISODateString, Nullable } from "./api.js";

/** Aggregate payload for the employee landing page. */
export interface EmployeeDashboard {
  date: ISODateString;
  employee: EmployeeSummary;
  attendance: AttendanceToday;
  leaveBalance: LeaveBalance;
  taskSummary: TaskSummary;
  todayTasks: Task[];
  upcomingMeetings: Meeting[];
  openQueries: number;
  recentActivity: ActivityEntry[];
}

export type ManagerAlertSeverity = "info" | "warning" | "critical";
export type ManagerAlertType = "attendance" | "leave" | "task" | "query";

export interface ManagerAlert {
  id: EntityId;
  type: ManagerAlertType;
  severity: ManagerAlertSeverity;
  message: string;
  employeeId: Nullable<EntityId>;
  createdAt: ISODateString;
}

/** Aggregate payload for the manager landing page. */
export interface ManagerDashboard {
  date: ISODateString;
  team: TeamAttendance;
  pendingLeaves: LeaveRequest[];
  taskSummary: TeamTaskSummary;
  recentQueries: EmployeeQueryRecord[];
  alerts: ManagerAlert[];
  recentActivity: ActivityEntry[];
}

export interface TeamReportRow {
  employee: EmployeeSummary;
  attendance: AttendanceRangeSummary;
  leaveDays: number;
  tasksCompleted: number;
}

export interface TeamReport {
  from: ISODateString;
  to: ISODateString;
  rows: TeamReportRow[];
}
