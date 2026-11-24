import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  Eye,
  History,
  PieChart,
  Plane,
  TrendingUp,
  Users2,
  X,
  Zap,
} from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Reports from "./Reports";
import Organization from "./Organization";
import MyTeam from "./MyTeam";
import TeamAttendance from "./TeamAttendance";
import LeaveRequests from "./LeaveRequests";
import Performance from "./Performance";
import GoalsTasks from "./section/GoalsTasks";
import Announcements from "./section/Announcements";
import HelpSupport from "./section/HelpSupport";
import ScheduleReport from "./section/ScheduleReport";
import MarkAttendance from "./section/MarkAttendance";
import AttendanceCalendar from "./section/AttendanceCalendar";
import ManageShifts from "./section/ManageShifts";
import RequestReview from "./section/RequestReview";
import AddEmployee from "./section/AddEmployee";
import ApplyLeave from "./section/ApplyLeave";
import LeavePolicies from "./section/LeavePolicies";
import ProfileSettings from "./ProfileSettings";
import employeeApi from "../../lib/employeeApi";
import useMyAttendance from "../../hooks/useMyAttendance";
import type { ManagerDashboardData, TeamAttendanceRow, TeamAttendanceStats } from "../../types/Employee";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function formatLeaveDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function formatFullDate(value: string) {
  if (!value || value === "—") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function formatJoinDate(value: string) {
  if (!value || value === "—") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function formatTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatWorkingMinutes(minutes?: number) {
  const total = Math.max(0, Math.floor(minutes ?? 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
}

const LEAVE_LABELS: Record<string, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  earned: "Earned Leave",
  unpaid: "Unpaid Leave",
  personal: "Personal Leave",
};

function leaveLabel(type: unknown) {
  const key = typeof type === "string" ? type.toLowerCase() : "";
  return LEAVE_LABELS[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : "—");
}

function statusPill(value: unknown) {
  const text = typeof value === "string" && value ? value : "—";
  const key = text.toLowerCase();
  if (key.includes("leave")) return { text, cls: "bg-[#FFF1E3] text-[#E57F1F]", dot: "bg-[#F59E42]" };
  if (key.includes("absent")) return { text, cls: "bg-[#FFE9EA] text-[#D2444F]", dot: "bg-[#EF5B67]" };
  if (key.includes("late")) return { text, cls: "bg-[#FFF6DD] text-[#B98100]", dot: "bg-[#EAB308]" };
  if (key.includes("present")) return { text, cls: "bg-[#E7F7EE] text-[#169A5F]", dot: "bg-[#22B573]" };
  return { text, cls: "bg-[#F1F4F8] text-[#687990]", dot: "bg-[#A3AFC2]" };
}

function stringField(value: unknown, key: string) {
  return typeof value === "object" && value !== null && key in value && typeof value[key as keyof typeof value] === "string"
    ? value[key as keyof typeof value] as string
    : "—";
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  }
  return fallback;
}

function leaveEmployeeName(employee: unknown) {
  if (typeof employee !== "object" || employee === null) return "Employee";
  const firstName = "firstName" in employee && typeof employee.firstName === "string" ? employee.firstName : "";
  const lastName = "lastName" in employee && typeof employee.lastName === "string" ? employee.lastName : "";
  return `${firstName} ${lastName}`.trim() || "Employee";
}

const StatCard: React.FC<{
  label: string;
  value: number | string;
  sub: string;
  tone: "blue" | "green" | "orange" | "purple";
  icon: React.ElementType;
}> = ({ label, value, sub, tone, icon: Icon }) => {
  const styles = {
    blue: { icon: "bg-[#E1ECFF] text-[#2F6BEA]", blob: "from-transparent to-[#DCE8FF]" },
    green: { icon: "bg-[#DDF5E8] text-[#19A463]", blob: "from-transparent to-[#D6F3E4]" },
    orange: { icon: "bg-[#FFE8D4] text-[#F28C38]", blob: "from-transparent to-[#FFE3CB]" },
    purple: { icon: "bg-[#E8E3FF] text-[#6B4EE0]", blob: "from-transparent to-[#E4DEFF]" },
  }[tone];
  return (
    <section className="relative flex min-h-[100px] items-center gap-4 overflow-hidden rounded-xl border border-[#E6ECF6] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
      <div className={`pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${styles.blob}`} />
      <div className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${styles.icon}`}>
        <Icon size={26} strokeWidth={2.2} />
      </div>
      <div className="relative min-w-0">
        <p className="truncate text-[13px] font-bold text-[#10284A]">{label}</p>
        <p className="mt-0.5 text-[30px] font-extrabold leading-none text-[#10284A]">{value}</p>
        <p className="mt-1.5 truncate text-[11px] font-medium text-[#6B7C99]">{sub}</p>
      </div>
    </section>
  );
};

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = "", children }) => (
  <section className={`rounded-xl border border-[#E6ECF6] bg-white p-5 shadow-[0_2px_10px_rgba(30,64,120,.05)] ${className}`}>
    {children}
  </section>
);

const CardTitle: React.FC<{ icon: React.ElementType; title: string; action?: React.ReactNode }> = ({ icon: Icon, title, action }) => (
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-2.5">
      <Icon size={20} className="text-[#2459A6]" />
      <h2 className="text-[16px] font-extrabold text-[#10284A]">{title}</h2>
    </div>
    {action}
  </div>
);

const ViewAll: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-1 text-[11px] font-bold text-[#2459A6] hover:underline">
    View All <ArrowRight size={13} />
  </button>
);

const ManagerDashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { attendanceToday, loading: attendanceLoading, checkedIn } = useMyAttendance();
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!checkedIn) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [checkedIn]);
  const liveWorkingMinutes = React.useMemo(() => {
    const persisted = attendanceToday?.workingMinutes ?? 0;
    if (!checkedIn) return persisted;
    const checkInMs = new Date(attendanceToday?.checkIn ?? 0).getTime();
    if (Number.isNaN(checkInMs)) return persisted;
    const endMs = attendanceToday?.breakStart ? new Date(attendanceToday.breakStart).getTime() : now;
    return Math.max(0, (endMs - checkInMs) / 60000 - (attendanceToday?.breakMinutes ?? 0));
  }, [attendanceToday, checkedIn, now]);
  const isMyTeamPage = location.pathname === "/manager/team-members";
  const isTeamAttendancePage = location.pathname === "/manager/team-attendance";
  const isLeaveRequestsPage = location.pathname === "/manager/leave-requests";
  const isPerformancePage = location.pathname === "/manager/performance";
  const isGoalsTasksPage = location.pathname === "/manager/goals-tasks";
  const isAnnouncementsPage = location.pathname === "/manager/announcements";
  const isHelpSupportPage = location.pathname === "/manager/help-support";
  const isProfileSettingsPage = location.pathname === "/manager/profile-settings";
  const isReportsPage = location.pathname === "/manager/reports";
  const isOrganizationPage = location.pathname === "/manager/organization";
  const isScheduleReportPage = location.pathname === "/manager/schedule-report";
  const isMarkAttendancePage = location.pathname === "/manager/mark-attendance";
  const isAttendanceCalendarPage = location.pathname === "/manager/attendance-calendar";
  const isManageShiftsPage = location.pathname === "/manager/manage-shifts";
  const isRequestReviewPage = location.pathname === "/manager/request-review";
  const isAddEmployeePage = location.pathname === "/manager/add-employee";
  const isApplyLeavePage = location.pathname === "/manager/apply-leave";
  const isLeavePoliciesPage = location.pathname === "/manager/leave-policies";
  const isDashboardPage = location.pathname === "/manager";
  const [dashboard, setDashboard] = React.useState<ManagerDashboardData | null>(null);
  const [stats, setStats] = React.useState<TeamAttendanceStats | null>(null);
  const [rows, setRows] = React.useState<TeamAttendanceRow[]>([]);
  const [attendanceDataLoaded, setAttendanceDataLoaded] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const fetchDashboard = React.useCallback(async () => {
    if (isDashboardPage) {
      const [dashboardResult, statsResult, rowsResult] = await Promise.allSettled([
        employeeApi.get<ManagerDashboardData>("/managers-dashboard"),
        employeeApi.get<{ stats: TeamAttendanceStats }>("/team/attendance/stats"),
        employeeApi.get<{ rows: TeamAttendanceRow[] }>("/team/attendance/rows"),
      ]);
      if (dashboardResult.status === "fulfilled") setDashboard(dashboardResult.value.data);
      if (statsResult.status === "fulfilled") setStats(statsResult.value.data?.stats ?? null);
      if (rowsResult.status === "fulfilled") setRows(rowsResult.value.data?.rows ?? []);
      setAttendanceDataLoaded(statsResult.status === "fulfilled" || rowsResult.status === "fulfilled");
      const failures = [dashboardResult, statsResult, rowsResult].filter((result) => result.status === "rejected");
      setError(failures.length ? apiErrorMessage(failures[0].reason, "Some dashboard data could not be loaded.") : null);
    } else {
      const [dashboardResult] = await Promise.allSettled([
        employeeApi.get<ManagerDashboardData>("/managers-dashboard"),
      ]);
      if (dashboardResult.status === "fulfilled") {
        setDashboard(dashboardResult.value.data);
        setError(null);
      } else {
        setError(apiErrorMessage(dashboardResult.reason, "Could not load leave requests."));
      }
    }
    setLoading(false);
  }, [isDashboardPage]);

  React.useEffect(() => {
    if (isDashboardPage || isLeaveRequestsPage) void Promise.resolve().then(fetchDashboard);
  }, [fetchDashboard, isDashboardPage, isLeaveRequestsPage]);

  const reviewLeave = async (requestId: string, status: "approved" | "rejected") => {
    if (!requestId) return;
    setBusyId(requestId);
    try {
      await employeeApi.patch(`/team/leave/${requestId}/status`, { status });
      await fetchDashboard();
    } catch (reviewError) {
      setError(apiErrorMessage(reviewError, "Could not update the leave request."));
    } finally {
      setBusyId(null);
    }
  };

  const present = stats?.present ?? Number(dashboard?.attendance?.present ?? 0);
  const absent = stats?.absent ?? Number(dashboard?.attendance?.absent ?? 0);
  const total = stats?.total ?? rows.length;
  const onLeave = stats?.onLeave ?? 0;
  const hasAttendanceData = attendanceDataLoaded || stats !== null || rows.length > 0 || dashboard?.attendance !== undefined;
  const pendingLeaves = dashboard?.pendingLeaves ?? [];
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const presentPct = pct(present);
  const onLeavePct = pct(onLeave);
  const absentPct = pct(absent);

  const teamRows = rows.slice(0, 5);
  const leaveRows = pendingLeaves.slice(0, 3);
  const alerts = (dashboard?.alerts ?? []).slice(0, 4);

  const dash = loading || !hasAttendanceData;

  return (
    <div className="min-h-screen bg-[#F5F8FE] text-[#10284A]">
      <Sidebar active={isMyTeamPage ? "team-members" : isTeamAttendancePage || isMarkAttendancePage || isAttendanceCalendarPage || isManageShiftsPage ? "team-attendance" : isLeaveRequestsPage || isApplyLeavePage || isLeavePoliciesPage ? "leave-requests" : isPerformancePage || isRequestReviewPage ? "performance" : isReportsPage || isScheduleReportPage ? "reports" : isOrganizationPage || isAddEmployeePage ? "organization" : isGoalsTasksPage ? "goals" : isAnnouncementsPage ? "announcements" : isHelpSupportPage ? "help-support" : isProfileSettingsPage ? "profile-settings" : "dashboard"} />
      <main className="ml-14 min-h-screen min-w-0 md:ml-52">
        <Header notifications={pendingLeaves} />
        {isMyTeamPage ? (
          <MyTeam />
        ) : isTeamAttendancePage ? (
          <TeamAttendance />
        ) : isLeaveRequestsPage ? (
          <LeaveRequests
            requests={dashboard?.pendingLeaves}
            loading={loading}
            loadError={error}
            onReviewed={fetchDashboard}
          />
        ) : isPerformancePage ? (
          <Performance />
        ) : isRequestReviewPage ? (
          <RequestReview />
        ) : isReportsPage ? (
          <Reports />
        ) : isScheduleReportPage ? (
          <ScheduleReport />
        ) : isOrganizationPage ? (
          <Organization />
        ) : isAddEmployeePage ? (
          <AddEmployee />
        ) : isMarkAttendancePage ? (
          <MarkAttendance />
        ) : isAttendanceCalendarPage ? (
          <AttendanceCalendar />
        ) : isManageShiftsPage ? (
          <ManageShifts />
        ) : isApplyLeavePage ? (
          <ApplyLeave />
        ) : isLeavePoliciesPage ? (
          <LeavePolicies />
        ) : isGoalsTasksPage ? (
          <GoalsTasks />
        ) : isAnnouncementsPage ? (
          <Announcements />
        ) : isHelpSupportPage ? (
          <HelpSupport />
        ) : isProfileSettingsPage ? (
          <ProfileSettings />
        ) : (
        <div className="space-y-5 px-4 py-4 lg:px-6">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</div>
          )}

          {/* Attendance summary */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#E6ECF6] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#6B7C99]">
                <Clock3 size={15} className="text-[#2F6BEA]" />
                Check In Time
              </div>
              <p className="mt-2 text-[24px] font-extrabold text-[#10284A]">
                {attendanceLoading ? "—" : formatTime(attendanceToday?.checkIn)}
              </p>
              <p className="mt-1 text-[11px] text-[#8795AA]">{checkedIn ? "Currently checked in" : "Not checked in"}</p>
            </div>
            <div className="rounded-xl border border-[#E6ECF6] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#6B7C99]">
                <Clock3 size={15} className="text-[#EF5B67]" />
                Check Out Time
              </div>
              <p className="mt-2 text-[24px] font-extrabold text-[#10284A]">
                {attendanceLoading ? "—" : formatTime(attendanceToday?.checkOut)}
              </p>
              <p className="mt-1 text-[11px] text-[#8795AA]">{attendanceToday?.checkOut ? "Checked out" : "—"}</p>
            </div>
            <div className="rounded-xl border border-[#E6ECF6] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#6B7C99]">
                <Clock3 size={15} className="text-[#19A463]" />
                Working Time
              </div>
              <p className="mt-2 text-[24px] font-extrabold text-[#10284A]">
                {attendanceLoading ? "—" : formatWorkingMinutes(liveWorkingMinutes)}
              </p>
              <p className="mt-1 text-[11px] text-[#8795AA]">{checkedIn ? "Live" : "Today's total"}</p>
            </div>
          </section>

          {/* Stat cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Team" value={dash ? "--" : total} sub="Current team size" tone="blue" icon={Users2} />
            <StatCard label="Present Today" value={dash ? "--" : present} sub={dash ? "Today's attendance" : `${presentPct}% of team`} tone="green" icon={ClipboardCheck} />
            <StatCard label="On Leave" value={dash ? "--" : onLeave} sub={dash ? "Today's attendance" : `${onLeavePct}% of team`} tone="orange" icon={Plane} />
            <StatCard label="Pending Approvals" value={loading || !dashboard ? "--" : pendingLeaves.length} sub="Leave requests" tone="purple" icon={Clock3} />
          </div>

          {/* Attendance trends + Team overview */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
            <Card>
              <CardTitle
                icon={BarChart3}
                title="Attendance Trends"
                action={<button type="button" onClick={() => navigate("/manager/team-attendance")} className="flex items-center gap-1 text-[11px] font-bold text-[#2459A6] hover:underline">View Details <ArrowRight size={13} /></button>}
              />
              <div className="relative mt-4 h-[200px]">
                {[100, 80, 60, 40, 20, 0].map((tick, i) => (
                  <div key={tick} className="absolute left-0 right-0 flex items-center gap-3 text-[11px] text-[#7C8CA6]" style={{ top: `${i * 20}%` }}>
                    <span className="w-9 -translate-y-1/2 text-right">{tick}%</span>
                    <span className="h-px flex-1 -translate-y-1/2 bg-[#EDF1F7]" />
                  </div>
                ))}
                <div className="absolute inset-0 grid place-items-center px-10 text-center">
                  <p className="rounded-lg bg-white/90 px-4 py-2 text-[12px] text-[#8795AA]">Historical attendance data is not available from the current API.</p>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle icon={PieChart} title="Team Overview" />
              <div className="mt-5 flex flex-wrap items-center justify-around gap-5">
                <div
                  className="grid h-[150px] w-[150px] place-items-center rounded-full"
                  style={{
                    background: hasAttendanceData && total
                      ? `conic-gradient(#2F6BEA 0 ${presentPct}%, #F59E42 ${presentPct}% ${presentPct + onLeavePct}%, #C5CEDC ${presentPct + onLeavePct}% ${Math.min(100, presentPct + onLeavePct + absentPct)}%, #EDF2F7 ${Math.min(100, presentPct + onLeavePct + absentPct)}% 100%)`
                      : "#EDF2F7",
                  }}
                >
                  <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-white text-center">
                    <div>
                      <p className="text-[24px] font-extrabold leading-none">{hasAttendanceData && total ? `${presentPct}%` : "—"}</p>
                      <p className="mt-1 text-[12px] font-bold">Present</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 text-[13px]">
                  {([["Present", presentPct, "#2F6BEA"], ["On Leave", onLeavePct, "#F59E42"], ["Absent", absentPct, "#C5CEDC"]] as const).map(([label, value, color]) => (
                    <div key={label} className="grid grid-cols-[10px_70px_44px] items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="font-medium">{label}</span>
                      <strong className="text-right">{hasAttendanceData && total ? `${value}%` : "—"}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* My Team */}
          <Card>
            <CardTitle icon={Users2} title="My Team" action={<ViewAll onClick={() => navigate("/manager/team-members")} />} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-[13px]">
                <thead>
                  <tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]">
                    <th className="rounded-l-md px-3 py-2.5">Employee</th><th>Department</th><th>Designation</th><th>Status</th><th>Email</th><th className="rounded-r-md pr-3">Join Date</th>
                  </tr>
                </thead>
                <tbody>
                  {teamRows.map((row, index) => {
                    const name = row.name ?? "Team Member";
                    const pill = statusPill(row.attendance);
                    return (
                      <tr key={row._id ?? row.name ?? index} className="border-b border-[#F0F3F8] last:border-0">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E3EDFF] text-[11px] font-bold text-[#2459A6]">{initials(name)}</div>
                            <span className="font-semibold">{name}</span>
                          </div>
                        </td>
                        <td>{row.department ?? "—"}</td>
                        <td>{stringField(row, "designation")}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${pill.cls}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />{pill.text}
                          </span>
                        </td>
                        <td className="max-w-[200px] truncate pr-3">{stringField(row, "email")}</td>
                        <td className="pr-3">{formatJoinDate(stringField(row, "joinDate"))}</td>
                      </tr>
                    );
                  })}
                  {teamRows.length === 0 && (
                    <tr><td colSpan={6} className="h-16 text-center text-[12px] text-[#8795AA]">{loading ? "Loading team…" : "No team members available."}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pending leave requests */}
          <Card>
            <CardTitle icon={CalendarDays} title="Pending Leave Requests" action={<ViewAll onClick={() => navigate("/manager/leave-requests")} />} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead>
                  <tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]">
                    <th className="rounded-l-md px-3 py-2.5">Employee</th><th>Leave Type</th><th>Duration</th><th>Reason</th><th>Applied On</th><th className="rounded-r-md pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRows.map((leave, index: number) => {
                    const name = leaveEmployeeName(leave.employee);
                    const requestId = typeof leave._id === "string" ? leave._id : "";
                    const reason = typeof leave.reason === "string" && leave.reason ? leave.reason : "—";
                    const busy = busyId === requestId;
                    return (
                      <tr key={requestId || `${leave.leaveType}-${leave.fromDate}-${index}`} className="border-b border-[#F0F3F8] last:border-0">
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F7D9DF] text-[11px] font-bold text-[#8A2233]">{initials(name)}</div>
                            <span className="font-semibold">{name}</span>
                          </div>
                        </td>
                        <td>{leaveLabel(leave.leaveType)}</td>
                        <td>{formatLeaveDate(leave.fromDate)} – {formatLeaveDate(leave.toDate)}</td>
                        <td className="max-w-[180px] truncate pr-3">{reason}</td>
                        <td>{formatFullDate(stringField(leave, "createdAt"))}</td>
                        <td className="pr-3">
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={busy || !requestId} onClick={() => void reviewLeave(requestId, "approved")} className="inline-flex items-center gap-1 rounded-md bg-[#1F63E8] px-3.5 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#1850C0] disabled:opacity-50"><Check size={13} />Approve</button>
                            <button type="button" disabled={busy || !requestId} onClick={() => void reviewLeave(requestId, "rejected")} className="inline-flex items-center gap-1 rounded-md border border-[#1F63E8] bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#1F63E8] transition hover:bg-[#EEF4FF] disabled:opacity-50"><X size={13} />Reject</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && leaveRows.length === 0 && (
                    <tr><td colSpan={6} className="h-16 text-center text-[12px] text-[#8795AA]">No pending requests.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Team performance + Quick actions */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardTitle
                icon={TrendingUp}
                title="Team Performance"
                action={<button type="button" onClick={() => navigate("/manager/performance")} className="flex items-center gap-1 text-[11px] font-bold text-[#2459A6] hover:underline">View Details <ArrowRight size={13} /></button>}
              />
              <div className="mt-5 flex flex-wrap items-center gap-6">
                <div className="grid h-[110px] w-[110px] shrink-0 place-items-center rounded-full border-[6px] border-[#E3EBF8] text-center">
                  <div>
                    <p className="text-[24px] font-extrabold leading-none text-[#8795AA]">—</p>
                    <p className="mt-1 text-[10px] font-bold text-[#617492]">Overall</p>
                  </div>
                </div>
                <p className="min-w-[200px] flex-1 rounded-lg bg-[#F5F8FE] p-4 text-[12px] leading-5 text-[#617492]">
                  Performance scores are not available from the current manager API.
                </p>
              </div>
            </Card>

            <Card>
              <CardTitle icon={Zap} title="Quick Actions" />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {([
                  ["View Team", Users2, "/manager/team-members"],
                  ["Approve Leaves", ClipboardCheck, "/manager/leave-requests"],
                  ["Check Attendance", Eye, "/manager/team-attendance"],
                  ["Generate Report", BarChart3, "/manager/reports"],
                ] as const).map(([label, Icon, to]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigate(to)}
                    className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-xl border border-[#DCE6F7] bg-gradient-to-b from-[#F3F8FF] to-[#E6F0FF] text-[12px] font-bold text-[#10284A] transition hover:border-[#1F63E8] hover:shadow-sm"
                  >
                    <Icon size={22} className="text-[#1F63E8]" />
                    {label}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent activity */}
          <Card>
            <CardTitle icon={History} title="Recent Activity" />
            <ul className="mt-3">
              {alerts.map((alert, index) => (
                <li key={`${alert.category}-${index}`} className="flex items-center gap-3 border-b border-[#F0F3F8] py-2.5 text-[13px] last:border-0">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-[#1F63E8]" />
                  <span className="min-w-0 flex-1 truncate">{alert.text}</span>
                  <span className="shrink-0 text-[11px] text-[#8795AA]">{alert.time}</span>
                </li>
              ))}
              {alerts.length === 0 && <li className="py-6 text-center text-[12px] text-[#8795AA]">No recent activity is available.</li>}
            </ul>
          </Card>

          {/* Footer */}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6ECF6] pb-2 pt-4 text-[12px] text-[#4B5F7D]">
            <p><strong className="mr-2 text-[#1F63E8]">OnexHR</strong>© {new Date().getFullYear()} OnexHR. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <span className="cursor-pointer hover:underline">Privacy Policy</span>
              <span className="text-[#C5CEDC]">|</span>
              <span className="cursor-pointer hover:underline">Terms of Service</span>
              <span className="text-[#C5CEDC]">|</span>
              <button type="button" onClick={() => navigate("/manager/help-support")} className="hover:underline">Help</button>
            </div>
          </footer>
        </div>
        )}
      </main>
    </div>
  );
};

export default ManagerDashboard;
