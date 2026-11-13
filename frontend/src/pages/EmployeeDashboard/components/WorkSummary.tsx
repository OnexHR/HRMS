import React, { useEffect, useRef, useState } from "react";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  Check,
} from "lucide-react";
import type { AttendanceToday } from "../../../types/Employee";
import { computeLiveWorkingMinutes, computeOvertime } from "./attendanceLive";

type Summary = {
  startDate?: string;
  endDate?: string;
  totalWorkingMinutes?: number;
  totalOvertimeMinutes?: number;
  presentDays?: number;
  tasksCompleted?: number;
};

type TaskSummary = {
  total?: number;
  completed?: number;
};

// Admin-provided dates only. A missing or invalid date shows a plain "-".
function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Hours and minutes only. Minutes are floored, so a fractional value such as
// 11.8676... can never leak into the UI and seconds are never shown.
function formatDuration(minutes?: number) {
  const total = Math.max(0, Math.floor(minutes ?? 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
}

// Every card shares this layout, so icon + label always sit side by side on one
// line and the value goes underneath. Previously one card had a different
// structure, which is why its label overlapped the card edge.
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  tone: string;
  iconBg: string;
  label: string;
  value: React.ReactNode;
}> = ({ icon, tone, iconBg, label, value }) => (
  // The card is a CSS size container, so the label font scales with the card's
  // own width (cqw units) and always fits on one line, whatever the screen.
  <div
    className={`min-w-0 rounded-xl border p-3.5 ${tone}`}
    style={{ containerType: "inline-size" }}
  >
    <div className="flex min-w-0 items-center gap-2">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>

      <p
        className="whitespace-nowrap font-medium text-gray-500"
        style={{ fontSize: "clamp(10px, 6.2cqw, 14px)" }}
      >
        {label}
      </p>
    </div>

    <p
      className="mt-4 whitespace-nowrap text-center font-bold text-[#10284A]"
      style={{ fontSize: "clamp(15px, 9cqw, 21px)" }}
    >
      {value}
    </p>
  </div>
);

const WorkSummary: React.FC<{
  summary?: Summary;
  taskSummary?: TaskSummary;
  attendanceToday?: AttendanceToday;
  loading?: boolean;
}> = ({ summary, taskSummary, attendanceToday }) => {
  // Join date and end date are set by the admin only, and are read from the
  // signed-in employee's job record (the same source the Profile page uses via
  // GET /me), refreshed once when this card mounts. The dashboard summary's own
  // start/end dates are NOT used: the backend derives them (range start, today,
  // created date...), so they showed a date even when the admin had set none.
  // If the admin has not provided a date, the card shows "-".
  const { employee, refreshEmployee } = useEmployeeAuth();

  useEffect(() => {
    refreshEmployee?.()?.catch?.(() => null);
    // Run once when the card appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startDate: string | undefined = (employee?.job as any)?.joinDate || undefined;
  const endDate: string | undefined = (employee?.job as any)?.endDate || undefined;

  // Re-render a few times a second while checked in, so the card flips to the next
  // minute at the same moment the Today's Attendance card does (never behind it).
  const checkedIn = Boolean(attendanceToday?.checkIn && !attendanceToday?.checkOut);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!checkedIn) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [checkedIn]);

  // Total Working Hours and Total Overtime move in step with the Today's
  // Attendance counters, and they carry on without needing a page refresh:
  // - While checked in: total = base + what Today's counter has gained since the
  //   snapshot (same functions, same clock), so both advance together.
  // - At check-out: the total freezes at the value last shown. It does NOT reset
  //   and does not wait for the summary to be refetched.
  // - At the next check-in: it continues from that frozen value and grows with
  //   Today's counter again.
  // - Whenever fresh summary data arrives, the server's total becomes the new
  //   base (it wins over the locally carried value).
  const sessionKey = `${attendanceToday?.checkIn ?? ""}|${attendanceToday?.checkOut ?? ""}`;
  const snapRef = useRef({
    init: false,
    summary: undefined as Summary | undefined,
    sessionKey: "",
    base: 0,
    anchor: 0,
    ovBase: 0,
    ovAnchor: 0,
    total: 0,
    ovTotal: 0,
  });
  const snap = snapRef.current;

  if (!snap.init || snap.summary !== summary) {
    // First render, or new summary data from the server: re-base on it.
    snap.base = summary?.totalWorkingMinutes ?? 0;
    snap.ovBase = summary?.totalOvertimeMinutes ?? 0;
    snap.anchor = checkedIn ? Math.floor(computeLiveWorkingMinutes(attendanceToday, Date.now())) : 0;
    snap.ovAnchor = checkedIn ? Math.floor(computeOvertime(attendanceToday, Date.now()).minutes) : 0;
    snap.summary = summary;
    snap.sessionKey = sessionKey;
    snap.init = true;
  } else if (snap.sessionKey !== sessionKey) {
    // Check-in / check-out happened but the summary has not been refreshed yet:
    // carry on from the value currently shown.
    snap.base = snap.total;
    snap.ovBase = snap.ovTotal;
    snap.anchor = checkedIn ? Math.floor(computeLiveWorkingMinutes(attendanceToday, Date.now())) : 0;
    snap.ovAnchor = checkedIn ? Math.floor(computeOvertime(attendanceToday, Date.now()).minutes) : 0;
    snap.sessionKey = sessionKey;
  }

  // Use the real clock at render time (not the `now` state, which can be stale
  // for a moment right after a check-in). `now` only forces the re-render.
  void now;
  const t = Date.now();

  // Count WHOLE minutes only, exactly as Today's Attendance displays them, so the
  // total's minute changes at the very same second as Today's minute does. Using
  // fractional values here made the two roll over at different moments.
  const gained = checkedIn
    ? Math.max(0, Math.floor(computeLiveWorkingMinutes(attendanceToday, t)) - snap.anchor)
    : 0;
  const overtimeGained = checkedIn
    ? Math.max(0, Math.floor(computeOvertime(attendanceToday, t).minutes) - snap.ovAnchor)
    : 0;

  const totalWorkingMinutes = Math.floor(snap.base) + gained;
  const totalOvertimeMinutes = Math.floor(snap.ovBase) + overtimeGained;
  snap.total = totalWorkingMinutes;
  snap.ovTotal = totalOvertimeMinutes;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <BarChart3 size={21} className="text-[#2459A6]" />
          </div>

          <h3 className="text-xl font-semibold text-[#10284A]">Work Summary</h3>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-3 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 shadow-sm">
          <CalendarDays size={18} className="shrink-0 text-[#2459A6]" />

          <span>{formatDate(startDate)}</span>

          <span className="text-gray-400">−</span>

          <span>{formatDate(endDate)}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-5 grid grid-cols-5 gap-3">
        <SummaryCard
          tone="border-blue-100 bg-blue-50"
          iconBg="bg-white"
          icon={<CalendarDays size={18} className="text-[#2459A6]" />}
          label="Join Date"
          value={formatDate(startDate)}
        />

        <SummaryCard
          tone="border-violet-100 bg-violet-50"
          iconBg="bg-white"
          icon={<CalendarDays size={18} className="text-violet-600" />}
          label="End Date"
          value={formatDate(endDate)}
        />

        <SummaryCard
          tone="border-green-100 bg-green-50"
          iconBg="bg-white"
          icon={<Clock3 size={18} className="text-green-600" />}
          label="Total Working Hours"
          value={formatDuration(totalWorkingMinutes)}
        />

        <SummaryCard
          tone="border-orange-100 bg-orange-50"
          iconBg="bg-white"
          icon={<Clock3 size={18} className="text-orange-600" />}
          label="Total Overtime"
          value={formatDuration(totalOvertimeMinutes)}
        />

        <SummaryCard
          tone="border-emerald-100 bg-emerald-50"
          iconBg="bg-white"
          icon={<Check size={18} className="text-emerald-600" />}
          label="Tasks Completed"
          value={taskSummary?.completed ?? summary?.tasksCompleted ?? 0}
        />
      </div>
    </section>
  );
};

export default WorkSummary;