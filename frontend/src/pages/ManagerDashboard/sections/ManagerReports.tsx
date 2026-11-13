import React from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Loader2,
  Percent,
  Target,
  Timer,
  TrendingUp,
  UsersRound,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import employeeApi from "../../../lib/employeeApi";
import type { EmployeeMonthlyReport } from "../../../types/Employee";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEK_HEADERS = ["S", "M", "T", "W", "T", "F", "S"];

const pad = (n: number) => String(n).padStart(2, "0");

function keyFor(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function formatDuration(minutes?: number) {
  const total = Math.max(0, minutes ?? 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  return `${h}h ${m}m`;
}

function initialsFor(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const STATUS_STYLES: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  late: "bg-amber-100 text-amber-700",
  absent: "bg-rose-100 text-rose-600",
  leave: "bg-blue-100 text-blue-700",
};

// Cells laid out Sunday-first; weekdays get a status chip from the report,
// weekends stay blank.
function weekdayCells(month: Date, byDay: Map<string, EmployeeMonthlyReport["days"][number]>) {
  const year = month.getFullYear();
  const first = new Date(year, month.getMonth(), 1);
  const last = new Date(year, month.getMonth() + 1, 0);

  const cells: (number | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells.map((day) => {
    if (day === null) return null;
    const dateKey = keyFor(year, month.getMonth(), day);
    const info = byDay.get(dateKey);
    return {
      day,
      status: info?.status ?? "absent",
      info,
    };
  });
}

const ReportModal: React.FC<{
  report: EmployeeMonthlyReport;
  month: Date;
  onClose: () => void;
}> = ({ report, month, onClose }) => {
  const { member, summary, days } = report;
  const weeks = React.useMemo(() => {
    const byDay = new Map(days.map((day) => [day.date, day]));
    return weekdayCells(month, byDay);
  }, [month, days]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stats = [
    { label: "Present", value: summary.present, icon: CheckCircle2, tile: "bg-emerald-50", color: "text-emerald-600" },
    { label: "Late", value: summary.late, icon: Clock, tile: "bg-amber-50", color: "text-amber-600" },
    { label: "Absent", value: summary.absent, icon: XCircle, tile: "bg-rose-50", color: "text-rose-500" },
    { label: "On Leave", value: summary.onLeave, icon: CalendarOff, tile: "bg-blue-50", color: "text-blue-600" },
  ];

  const hours = [
    { label: "Working", value: formatDuration(summary.workingMinutes), icon: Timer, color: "text-[#2459A6]" },
    { label: "Break", value: formatDuration(summary.breakMinutes), icon: Coffee, color: "text-amber-600" },
    { label: "Overtime", value: formatDuration(summary.overtimeMinutes), icon: Zap, color: "text-violet-600" },
    { label: "Attendance", value: `${summary.attendanceRate}%`, icon: Target, color: "text-emerald-600" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${member.name} monthly report`}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10284A] to-[#2459A6] text-sm font-bold text-white shadow-sm">
              {initialsFor(member.name)}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Monthly report · {MONTHS[month.getMonth()]} {month.getFullYear()}
              </p>
              <h4 className="truncate text-lg font-bold text-[#10284A]">{member.name}</h4>
              <p className="truncate text-xs text-gray-500">
                {member.employeeCode ?? "-"}
                {member.department ? ` · ${member.department}` : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-gray-50 py-4 text-center">
                <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${stat.tile}`}>
                  <stat.icon size={17} className={stat.color} />
                </div>
                <p className={`mt-2 text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
                <p className="mt-0.5 text-xs font-medium text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {hours.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <stat.icon size={16} className={stat.color} />
                <p className={`mt-2.5 text-sm font-bold tabular-nums text-[#10284A]`}>{stat.value}</p>
                <p className="mt-0.5 text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-gray-100 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                <CalendarDays size={13} />
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-md bg-emerald-100 ring-1 ring-emerald-200" />Present · {summary.present}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-md bg-amber-100 ring-1 ring-amber-200" />Late · {summary.late}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-md bg-rose-100 ring-1 ring-rose-200" />Absent · {summary.absent}</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-md bg-blue-100 ring-1 ring-blue-200" />Leave · {summary.onLeave}</span>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {WEEK_HEADERS.map((label, i) => (
                <div
                  key={i}
                  className={`text-center text-[10px] font-semibold uppercase tracking-wider ${
                    i === 0 || i === 6 ? "text-gray-300" : "text-gray-400"
                  }`}
                >
                  {label}
                </div>
              ))}
              {weeks.map((cell, i) =>
                cell === null ? (
                  <div key={i} />
                ) : (
                  <div
                    key={i}
                    title={
                      cell.info?.status === "leave"
                        ? `Leave (${cell.info.leaveType ?? "full day"})`
                        : cell.info?.status === "late" || cell.info?.status === "present"
                          ? `${cell.info.status[0].toUpperCase()}${cell.info.status.slice(1)}${cell.info.workingMinutes ? ` · ${formatDuration(cell.info.workingMinutes)}` : ""}`
                          : "Absent"
                    }
                    className={`flex aspect-square items-center justify-center rounded-xl text-xs font-semibold tabular-nums shadow-sm ring-1 ring-black/5 transition-transform duration-150 hover:scale-110 ${STATUS_STYLES[cell.status] ?? "text-gray-300"}`}
                  >
                    {cell.day}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ManagerReports: React.FC = () => {
  const [month, setMonth] = React.useState(() => new Date());
  const [reports, setReports] = React.useState<EmployeeMonthlyReport[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openReport, setOpenReport] = React.useState<EmployeeMonthlyReport | null>(null);

  const fetchReports = React.useCallback(async (target: Date) => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeeApi.get<{ reports: EmployeeMonthlyReport[] }>("/team/reports", {
        params: { date: target.toISOString() },
      });
      setReports(res.data.reports ?? []);
    } catch (err: any) {
      setReports([]);
      setError(err.response?.data?.message || "Could not load team reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchReports(month);
  }, [month, fetchReports]);

  const shiftMonth = (delta: number) => {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth();

  const avgAttendance =
    reports.length > 0
      ? Math.round(reports.reduce((sum, report) => sum + (report.summary.attendanceRate ?? 0), 0) / reports.length)
      : 0;

  const lateDays = reports.reduce((sum, report) => sum + (report.summary.late ?? 0), 0);
  const overtimeMinutes = reports.reduce((sum, report) => sum + (report.summary.overtimeMinutes ?? 0), 0);

  const totals = reports.reduce(
    (acc, report) => ({
      present: acc.present + report.summary.present,
      late: acc.late + report.summary.late,
      absent: acc.absent + report.summary.absent,
      onLeave: acc.onLeave + report.summary.onLeave,
      workingMinutes: acc.workingMinutes + report.summary.workingMinutes,
    }),
    { present: 0, late: 0, absent: 0, onLeave: 0, workingMinutes: 0 },
  );

  const summaryCards = [
    { label: "Employees", value: reports.length, icon: UsersRound, bg: "bg-blue-50", iconColor: "text-[#2459A6]" },
    { label: "Avg Attendance", value: `${avgAttendance}%`, icon: Percent, bg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Late Arrivals", value: lateDays, icon: Clock, bg: "bg-amber-50", iconColor: "text-amber-600" },
    { label: "Overtime", value: formatDuration(overtimeMinutes), icon: TrendingUp, bg: "bg-violet-50", iconColor: "text-violet-600" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar active="reports" />

      <main className="ml-60">
        <Header />

        <div className="px-6 py-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10284A] to-[#2459A6] text-white shadow-sm">
                <BarChart3 size={21} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#10284A]">Employee Reports</h2>
                <p className="text-xs text-gray-500">Attendance &amp; leave summary for your team</p>
              </div>
            </div>

            <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-50 hover:text-[#2459A6]"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-44 border-x border-gray-100 px-4 text-center">
                <p className="text-sm font-semibold tabular-nums text-[#10284A]">
                  {MONTHS[month.getMonth()]} {month.getFullYear()}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {isCurrentMonth ? "This month" : "Selected month"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-50 hover:text-[#2459A6]"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${card.bg}`}>
                  <card.icon size={22} className={card.iconColor} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-500">{card.label}</p>
                  <p className="truncate text-2xl font-bold tabular-nums text-[#10284A]">
                    {loading ? "--" : card.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <section className="mt-5 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#10284A]/5">
                  <CalendarDays size={18} className="text-[#2459A6]" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#10284A]">Monthly Attendance Report</h3>
                  <p className="text-xs text-gray-400">
                    {reports.length} employee{reports.length === 1 ? "" : "s"} · {MONTHS[month.getMonth()]} {month.getFullYear()}
                  </p>
                </div>
              </div>
              {!loading && reports.length > 0 && (
                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {avgAttendance}% team attendance
                </span>
              )}
            </div>

            {error && <p className="px-6 pt-4 text-sm text-rose-600">{error}</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <th className="py-3 pl-6 pr-4 font-semibold">Employee</th>
                    <th className="py-3 pr-4 font-semibold">Department</th>
                    <th className="py-3 pr-4 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Present
                      </span>
                    </th>
                    <th className="py-3 pr-4 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Late
                      </span>
                    </th>
                    <th className="py-3 pr-4 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />Absent
                      </span>
                    </th>
                    <th className="py-3 pr-4 font-semibold">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />On Leave
                      </span>
                    </th>
                    <th className="py-3 pr-4 font-semibold">Working</th>
                    <th className="py-3 pr-4 font-semibold">Attendance</th>
                    <th className="py-3 pr-6 font-semibold">Report</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-sm text-gray-400">
                        <Loader2 size={18} className="mx-auto animate-spin" />
                        <span className="mt-2 block text-xs text-gray-400">Loading reports…</span>
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                          <UsersRound size={24} className="text-slate-300" />
                        </div>
                        <p className="mt-3 text-sm font-semibold text-gray-600">No reports yet</p>
                        <p className="mt-1 text-xs text-gray-400">
                          Add employees to your team to see their attendance reports.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => {
                      const { member, summary } = report;
                      const initials = initialsFor(member.name);
                      const rate = summary.attendanceRate ?? 0;
                      const rateColor =
                        rate >= 80 ? "bg-emerald-50 text-emerald-600" : rate >= 60 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600";
                      const barColor =
                        rate >= 80 ? "bg-emerald-500" : rate >= 60 ? "bg-amber-500" : "bg-rose-500";

                      return (
                        <tr key={member._id} className="text-sm transition-colors hover:bg-slate-50/70">
                          <td className="py-3.5 pl-6 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-xs font-bold text-[#2459A6] ring-1 ring-blue-100">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-[#10284A]">{member.name}</p>
                                <p className="truncate text-xs text-gray-400">{member.employeeCode ?? "-"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 pr-4 text-gray-600">
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              {member.department ?? "–"}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 font-semibold tabular-nums text-emerald-600">{summary.present}</td>
                          <td className="py-3.5 pr-4 font-semibold tabular-nums text-amber-600">{summary.late}</td>
                          <td className="py-3.5 pr-4 font-semibold tabular-nums text-rose-600">{summary.absent}</td>
                          <td className="py-3.5 pr-4 font-semibold tabular-nums text-blue-600">{summary.onLeave}</td>
                          <td className="py-3.5 pr-4 font-medium tabular-nums text-gray-700">{formatDuration(summary.workingMinutes)}</td>
                          <td className="py-3.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className={`h-full ${barColor} transition-all`}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                              <span className={`rounded-full ${rateColor} px-2 py-0.5 text-xs font-semibold tabular-nums`}>
                                {rate}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 pr-6">
                            <button
                              type="button"
                              onClick={() => setOpenReport(report)}
                              className="group inline-flex items-center gap-1.5 rounded-full border border-[#2459A6]/15 bg-blue-50/50 px-3.5 py-1.5 text-xs font-semibold text-[#2459A6] transition hover:bg-[#2459A6] hover:text-white"
                            >
                              View
                              <ArrowUpRight
                                size={14}
                                className="transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                              />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {!loading && reports.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-100 bg-slate-50/80 text-sm font-semibold text-[#10284A]">
                      <td className="py-3.5 pl-6 pr-4">Team total</td>
                      <td className="py-3.5 pr-4 text-gray-400">{reports.length} employees</td>
                      <td className="py-3.5 pr-4 tabular-nums text-emerald-600">{totals.present}</td>
                      <td className="py-3.5 pr-4 tabular-nums text-amber-600">{totals.late}</td>
                      <td className="py-3.5 pr-4 tabular-nums text-rose-600">{totals.absent}</td>
                      <td className="py-3.5 pr-4 tabular-nums text-blue-600">{totals.onLeave}</td>
                      <td className="py-3.5 pr-4 tabular-nums">{formatDuration(totals.workingMinutes)}</td>
                      <td className="py-3.5 pr-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                          avgAttendance >= 80 ? "bg-emerald-100 text-emerald-700" : avgAttendance >= 60 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                        }`}>
                          {avgAttendance}%
                        </span>
                      </td>
                      <td className="py-3.5 pr-6 text-gray-400">
                        <Timer size={16} />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </div>
      </main>

      {openReport && (
        <ReportModal report={openReport} month={month} onClose={() => setOpenReport(null)} />
      )}
    </div>
  );
};

export default ManagerReports;