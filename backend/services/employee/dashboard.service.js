import Attendance from "../../models/employee/Attendance.js";
import LeaveRequest from "../../models/employee/LeaveRequest.js";
import Task from "../../models/employee/Task.js";
import Meeting from "../../models/employee/Meeting.js";
import EmployeeQuery from "../../models/employee/EmployeeQuery.js";
import Employee from "../../models/employee/Employee.js";
import { recentActivity } from "./activity.service.js";
import { teamAttendanceToday } from "./attendance.service.js";
import {
  monthlyAttendance,
  summaryForRange,
  getOpenAttendance,
  liveWorkingMinutes,
  liveOvertimeMinutes,
} from "./attendance.service.js";
import {
  LATE_AFTER_MINUTES,
  kolkataMinutesOfDay,
} from "../../validators/employee/attendance.constants.js";
import { maxBreakMinutes } from "../../validators/employee/attendance.validator.js";
import { balanceView, pendingForManager } from "./leave.service.js";
import { getTaskSummaryFor } from "./task.service.js";

export async function employeeDashboard(employeeId, date = new Date()) {
  const employee = await Employee.findById(employeeId).lean();

  // The work summary covers the whole employment period: join date to end date,
  // or to today when the employment is ongoing (no end date set).
  const joinDate = employee?.job?.joinDate
    ? new Date(employee.job.joinDate)
    : new Date(date.getFullYear(), date.getMonth(), 1);
  const endDate = employee?.job?.endDate ? new Date(employee.job.endDate) : null;
  const today = new Date(date);
  let rangeEnd = endDate
    ? new Date(Math.min(endDate.getTime(), today.getTime()))
    : today;
  // A future join date must not produce an invalid (reversed) range.
  if (joinDate > rangeEnd) rangeEnd = new Date(joinDate);

  const [
    attendanceMonth,
    summary,
    recent,
    meetings,
    taskSummary,
    leave,
    pendingLeaves,
  ] = await Promise.all([
    monthlyAttendance(employeeId, date),
    summaryForRange(employeeId, joinDate, rangeEnd),
    recentActivity(employeeId, 15),
    Meeting.find({ participants: employeeId })
      .sort({ startTime: -1 })
      .limit(10)
      .populate("organizer", "firstName lastName")
      .populate("participants", "firstName lastName")
      .lean(),
    getTaskSummaryFor(employeeId),
    LeaveRequest.find({ employee: employeeId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    LeaveRequest.find({ employee: employeeId, status: "pending" })
      .sort({ fromDate: 1 })
      .lean(),
  ]);

  const attendanceToday = await attendanceTodayFor(employeeId);

  // The summary reports the employment end date (null when ongoing), not the
  // range actually summed (which is capped at today).
  summary.endDate = endDate;

  return {
    attendanceToday,
    attendanceMonth,
    summary,
    recentActivity: recent,
    meetings,
    taskSummary,
    todayWorkSummary: {
      totalTasks: taskSummary?.total ?? 0,
      completed: taskSummary?.completed ?? 0,
      inProgress: taskSummary?.inProgress ?? 0,
      onHold: taskSummary?.onHold ?? 0,
      pending: taskSummary?.pending ?? 0,
      workingMinutes: attendanceToday.workingMinutes ?? 0,
      breakMinutes: attendanceToday.breakMinutes ?? 0,
      overtimeMinutes: attendanceToday.overtimeMinutes ?? 0,
      meetingsCount: meetings?.length ?? 0,
    },
    leaveBalance: leave,
    pendingLeaves,
  };
}

// Current attendance state for today (live), used by both dashboards. A session
// that is still open after midnight keeps its original record, so the open record
// is returned instead of an empty new-day record and the live counters keep running.
export async function attendanceTodayFor(employeeId) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [today, open, leave] = await Promise.all([
    Attendance.findOne({
      employee: employeeId,
      date: todayStart,
    }).lean(),
    getOpenAttendance(employeeId),
    LeaveRequest.findOne({
      employee: employeeId,
      status: "approved",
      fromDate: { $lt: new Date(todayStart.getTime() + 86400000) },
      toDate: { $gte: todayStart },
    })
      .select("leaveType")
      .lean(),
  ]);

  const record = today || open;

  // Approved leave wins over attendance state. A member on leave has no
  // attendance record (and cannot create one), so without this they would read
  // as absent on their own dashboard and pick up an absence alert.
  if (leave) {
    return {
      status: "leave",
      leaveType: leave.leaveType || null,
      checkIn: null,
      checkOut: null,
      breakStart: null,
      breakMinutes: 0,
      workingMinutes: 0,
      overtimeMinutes: 0,
    };
  }

  if (!record) {
    return {
      status: "absent",
      checkIn: null,
      checkOut: null,
      breakStart: null,
      breakMinutes: 0,
      workingMinutes: 0,
      overtimeMinutes: 0,
    };
  }

  const isOpen = record.checkIn && !record.checkOut;
  // Live status while session is open: Present or Late (never "on_break" as final
  // status; "On Break" is shown as an overlay by the UI). Half Day is decided at check-out.
  let liveStatus = record.status;
  if (isOpen) {
    const checkInMin = kolkataMinutesOfDay(new Date(record.checkIn).getTime());
    if (checkInMin > LATE_AFTER_MINUTES) liveStatus = "late";
    else liveStatus = "present";
    // "On Break" is a live overlay; the UI shows it but the final day status remains
    // Present or Late. We include onBreak flag so the UI can show the overlay.
  }
  return {
    status: record.breakStart ? "on_break" : liveStatus,
    onBreak: Boolean(record.breakStart),
    checkIn: record.checkIn,
    checkOut: record.checkOut,
    // Sent so the client can tick a live working-hours counter that pauses
    // during a break, matching liveWorkingMinutes() in attendance.service.js.
    breakStart: record.breakStart || null,
    breakMinutes: record.breakMinutes || 0,
    // Live values while still on the clock; persisted once checked out.
    workingMinutes: isOpen ? liveWorkingMinutes(record) : record.workingMinutes || 0,
    overtimeMinutes: isOpen ? liveOvertimeMinutes(record) : record.overtimeMinutes || 0,
  };
}

export async function managerDashboard(managerId, date = new Date()) {
  const today = await teamAttendanceToday(managerId);
  const attendanceToday = await attendanceTodayFor(managerId);

  const [pendingLeaves, taskSummary, tasks, queries, alerts, activity] = await Promise.all([
    pendingForManager(managerId),
    teamTaskSummary(managerId),
    Task.find({ assignedBy: managerId }).sort({ createdAt: -1 }).limit(20).lean(),
    EmployeeQuery.find({ "employee.manager": managerId }).sort({ createdAt: -1 }).limit(20).lean(),
    buildAlerts(managerId),
    recentActivity(managerId, 10),
  ]);

  // Quick actions / dashboard aggregate.
  return {
    date: today.date,
    attendanceToday,
    attendance: today.stats,
    attendanceRows: today.rows,
    currentActivity: {
      onBreak: today.stats.onBreak,
      onBreakPct: today.stats.onBreakPct,
      onCall: today.stats.onCall,
      onCallPct: today.stats.onCallPct,
      abnormal: today.stats.abnormal,
      abnormalPct: today.stats.abnormalPct,
    },
    pendingLeaves,
    taskSummary: {
      total: taskSummary.total,
      completed: taskSummary.completed,
      inProgress: taskSummary.inProgress,
      overdue: taskSummary.overdue,
    },
    tasks,
    queries,
    alerts,
    recentActivity: activity,
  };
}

async function teamTaskSummary(managerId) {
  const Employee = (await import("../../models/employee/Employee.js")).default;
  const team = await Employee.find({ manager: managerId, "job.isActive": true })
    .select("_id")
    .lean();
  const memberIds = team.map((m) => m._id);
  const all = memberIds.length
    ? await Task.find({ assignedTo: { $in: memberIds } }).lean()
    : [];
  const now = new Date();
  return {
    total: all.length,
    completed: all.filter((t) => t.status === "Completed").length,
    inProgress: all.filter((t) => t.status === "In Progress").length,
    overdue: all.filter((t) => t.dueDate && t.dueDate < now && t.status !== "Completed").length,
    pending: all.filter((t) => t.status === "Pending").length,
    onHold: all.filter((t) => t.status === "On Hold").length,
  };
}

function timeLabel(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(date) {
  const now = new Date();
  const d = new Date(date);
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

async function buildAlerts(managerId) {
  const Employee = (await import("../../models/employee/Employee.js")).default;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const breakLimit = maxBreakMinutes();

  const team = await Employee.find({ manager: managerId, "job.isActive": true })
    .select("_id firstName lastName")
    .lean();
  const ids = team.map((m) => m._id);

  const [records, leaves, reviewedLeaves] = await Promise.all([
    ids.length
      ? Attendance.find({ employee: { $in: ids }, date: { $gte: todayStart, $lt: todayEnd } }).lean()
      : [],
    ids.length
      ? LeaveRequest.find({
          employee: { $in: ids },
          status: "approved",
          fromDate: { $lt: todayEnd },
          toDate: { $gte: todayStart },
        }).lean()
      : [],
    ids.length
      ? LeaveRequest.find({
          employee: { $in: ids },
          status: { $in: ["approved", "rejected"] },
          reviewedAt: { $gte: yesterdayStart },
        })
          .populate("employee", "firstName lastName")
          .sort({ reviewedAt: -1 })
          .limit(10)
          .lean()
      : [],
  ]);

  const leaveIds = new Set(leaves.map((l) => String(l.employee)));
  const alerts = [];

  for (const member of team) {
    const rec = records.find((r) => String(r.employee) === String(member._id));
    if (leaveIds.has(String(member._id))) continue;
    const name = `${member.firstName} ${member.lastName}`;

    if (!rec) {
      alerts.push({ category: "Absent", text: `${name} has not checked in yet.`, time: "Today" });
      continue;
    }

    if (rec.breakStart) {
      const minutesOnBreak = Math.round((Date.now() - new Date(rec.breakStart).getTime()) / 60000);
      if (minutesOnBreak > breakLimit) {
        alerts.push({
          category: "Exceeded Break Time",
          text: `${name} has been on break for ${minutesOnBreak} min (limit ${breakLimit} min).`,
          time: timeLabel(rec.breakStart),
        });
      }
    }

    if ((rec.breakMinutes || 0) > breakLimit * 2) {
      alerts.push({
        category: "Abnormal",
        text: `${name} has logged ${rec.breakMinutes} break minutes today.`,
        time: "Today",
      });
    }
  }

  for (const leave of reviewedLeaves) {
    if (!leave.employee) continue;
    const name = `${leave.employee.firstName} ${leave.employee.lastName}`;
    alerts.push({
      category: "Other",
      text: leave.status === "approved" ? `${name}'s leave was approved.` : `${name}'s leave was rejected.`,
      time: dayLabel(leave.reviewedAt),
    });
  }

  return alerts;
}