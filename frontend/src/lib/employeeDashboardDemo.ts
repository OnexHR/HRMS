import type { AttendanceToday, EmployeeDashboardData } from "../types/Employee";

const STORAGE_KEY = "hrms_employee_dashboard_demo_v1";
const STANDARD_DAY_MINUTES = 540;

type DemoDay = {
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakMinutes: number;
};

type DemoActivity = {
  type: string;
  at: string;
};

type DemoStore = {
  days: Record<string, DemoDay>;
  activities: DemoActivity[];
};

export type DemoAttendanceAction = "check-in" | "check-out" | "break-start" | "break-end";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDemoDay(value: unknown): value is DemoDay {
  if (!isRecord(value)) return false;
  return (
    (value.checkIn === null || typeof value.checkIn === "string") &&
    (value.checkOut === null || typeof value.checkOut === "string") &&
    (value.breakStart === null || typeof value.breakStart === "string") &&
    typeof value.breakMinutes === "number"
  );
}

function isDemoActivity(value: unknown): value is DemoActivity {
  return isRecord(value) && typeof value.type === "string" && typeof value.at === "string";
}

function isDemoStore(value: unknown): value is DemoStore {
  if (!isRecord(value) || !isRecord(value.days) || !Array.isArray(value.activities)) return false;
  return Object.values(value.days).every(isDemoDay) && value.activities.every(isDemoActivity);
}

function readStore(): DemoStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { days: {}, activities: [] };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Saved demo attendance data is invalid. Clear this browser's local storage to continue.");
  }

  if (!isDemoStore(value)) {
    throw new Error("Saved demo attendance data is invalid. Clear this browser's local storage to continue.");
  }
  return value;
}

function writeStore(store: DemoStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function dayKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatMinutes(minutes: number) {
  const total = Math.max(0, Math.floor(minutes));
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

function workingMinutes(day?: DemoDay) {
  if (!day?.checkIn) return 0;
  const start = new Date(day.checkIn).getTime();
  const endValue = day.checkOut ?? day.breakStart;
  const end = endValue ? new Date(endValue).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("Saved demo attendance contains an invalid time.");
  }
  return Math.max(0, Math.floor((end - start - day.breakMinutes * 60000) / 60000));
}

export function getDemoAttendanceToday(): AttendanceToday {
  const store = readStore();
  const day = store.days[dayKey(new Date())];
  const minutes = workingMinutes(day);

  return {
    status: day?.breakStart ? "on_break" : day?.checkIn ? "present" : "absent",
    checkIn: day?.checkIn ?? null,
    checkOut: day?.checkOut ?? null,
    breakStart: day?.breakStart ?? null,
    breakMinutes: day?.breakMinutes ?? 0,
    workingMinutes: minutes,
    workHours: minutes / 60,
    overtimeMinutes: Math.max(0, minutes - STANDARD_DAY_MINUTES),
  };
}

export function getDemoAttendanceMonth(date: Date) {
  const store = readStore();
  const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-`;
  const dayMap = Object.fromEntries(
    Object.entries(store.days)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, day]) => {
        const minutes = workingMinutes(day);
        const overtime = Math.max(0, minutes - STANDARD_DAY_MINUTES);
        return [
          key,
          {
            date: key,
            status: day.checkIn ? "present" : "absent",
            checkIn: day.checkIn,
            checkOut: day.checkOut,
            workingHours: formatMinutes(minutes),
            breakTime: formatMinutes(day.breakMinutes),
            overtime: formatMinutes(overtime),
            tasksCompleted: 0,
          },
        ];
      }),
  );
  return { dayMap };
}

export function getDemoDashboard(): EmployeeDashboardData {
  const now = new Date();
  const attendanceToday = getDemoAttendanceToday();
  const store = readStore();

  return {
    attendanceToday,
    summary: {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      endDate: now.toISOString(),
      totalWorkingMinutes: attendanceToday.workingMinutes ?? 0,
      totalOvertimeMinutes: attendanceToday.overtimeMinutes ?? 0,
      presentDays: attendanceToday.checkIn ? 1 : 0,
      tasksCompleted: 0,
    },
    taskSummary: { total: 0, completed: 0, pending: 0, inProgress: 0, overdue: 0 },
    recentActivity: store.activities,
    meetings: [],
  };
}

export function applyDemoAttendanceAction(action: DemoAttendanceAction) {
  const store = readStore();
  const key = dayKey(new Date());
  const day = store.days[key] ?? {
    checkIn: null,
    checkOut: null,
    breakStart: null,
    breakMinutes: 0,
  };
  const now = new Date().toISOString();
  let activityType: string;

  switch (action) {
    case "check-in":
      if (day.checkIn && !day.checkOut) throw new Error("You are already checked in.");
      day.checkIn = now;
      day.checkOut = null;
      day.breakStart = null;
      day.breakMinutes = 0;
      activityType = "checkin";
      break;
    case "check-out":
      if (!day.checkIn || day.checkOut) throw new Error("Check in before checking out.");
      if (day.breakStart) {
        day.breakMinutes += Math.max(
          0,
          (Date.now() - new Date(day.breakStart).getTime()) / 60000,
        );
        day.breakStart = null;
      }
      day.checkOut = now;
      activityType = "checkout";
      break;
    case "break-start":
      if (!day.checkIn || day.checkOut || day.breakStart) {
        throw new Error("A break can only start while checked in.");
      }
      day.breakStart = now;
      activityType = "break_start";
      break;
    case "break-end":
      if (!day.breakStart) throw new Error("There is no active break to end.");
      day.breakMinutes += Math.max(
        0,
        (Date.now() - new Date(day.breakStart).getTime()) / 60000,
      );
      day.breakStart = null;
      activityType = "break_end";
      break;
  }

  store.days[key] = day;
  store.activities = [{ type: activityType, at: now }, ...store.activities].slice(0, 100);
  writeStore(store);
}
