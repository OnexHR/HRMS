import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CalendarCheck2, CalendarDays, Download, FileText, PieChart, Plane, Star, TrendingUp, Trophy, Users, Zap } from "lucide-react";
import employeeApi from "../../lib/employeeApi";
import type { ManagerDashboardData, TeamAttendanceRow, TeamAttendanceStats } from "../../types/Employee";
import { Avatar, Card, CardTitle, Donut, InfoModal, Legend, LineChart, LinkButton, PageShell, Pill, PrimaryButton, QuickActions, StatCard, Th, downloadCsv, field, lastMonths, monthLabel, sameMonth } from "./ui";

type LeaveItem = NonNullable<ManagerDashboardData["pendingLeaves"]>[number];
type Tab = "Attendance" | "Performance" | "Leaves" | "Employee Summary";
const COLORS = ["#2F6BEA", "#22B573", "#8B5CF6", "#F59E42"];

const nameOf = (row: TeamAttendanceRow) => row.name || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Team Member";
const leaveName = (leave: LeaveItem) => {
  const info = leave.employee as { firstName?: unknown; lastName?: unknown } | undefined;
  return [info?.firstName, info?.lastName].filter((p): p is string => typeof p === "string" && p.length > 0).join(" ") || "Team Member";
};
const attLabel = (value?: string) => {
  const key = (value ?? "").toLowerCase();
  return key === "leave" || key === "on leave" ? "On Leave" : key === "late" ? "Late" : key === "absent" ? "Absent" : key === "present" ? "Present" : "—";
};

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<TeamAttendanceRow[]>([]);
  const [stats, setStats] = React.useState<TeamAttendanceStats | null>(null);
  const [leaves, setLeaves] = React.useState<LeaveItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("Attendance");

  React.useEffect(() => {
    let active = true;
    (async () => {
      const [s, r, d] = await Promise.allSettled([
        employeeApi.get<{ stats: TeamAttendanceStats }>("/team/attendance/stats"),
        employeeApi.get<{ rows: TeamAttendanceRow[] }>("/team/attendance/rows"),
        employeeApi.get<ManagerDashboardData>("/managers-dashboard"),
      ]);
      if (!active) return;
      if (s.status === "fulfilled") setStats(s.value.data?.stats ?? null);
      if (r.status === "fulfilled") setRows(r.value.data?.rows ?? []);
      if (d.status === "fulfilled") setLeaves(d.value.data?.pendingLeaves ?? []);
      if ([s, r, d].some((x) => x.status === "rejected")) setError("Some report data could not be loaded.");
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const total = stats?.total ?? rows.length;
  const present = stats?.present ?? 0;
  const late = stats?.late ?? 0;
  const rate = total ? Math.round(((present + late) / total) * 1000) / 10 : 0;

  const deptCounts = Object.entries(rows.reduce<Record<string, number>>((acc, row) => { const k = row.department || "Others"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const topDepts = deptCounts.slice(0, 3);
  const otherCount = deptCounts.slice(3).reduce((sum, [, n]) => sum + n, 0);
  const deptList = otherCount ? [...topDepts, ["Others", otherCount] as [string, number]] : topDepts;

  const months = lastMonths(6);
  const leaveSeries = months.map((m) => leaves.filter((l) => sameMonth(new Date(String(l.fromDate)), m)).length);
  const yMax = Math.max(4, Math.ceil(Math.max(0, ...leaveSeries) / 2) * 2);

  const tableHead: Record<Tab, string[]> = {
    Attendance: ["Employee", "Department", "Check In", "Check Out", "Status"],
    Performance: [],
    Leaves: ["Employee", "Leave Type", "Dates", "Reason", "Status"],
    "Employee Summary": ["Employee", "Department", "Designation", "Email", "Status"],
  };
  const tableRows: Array<{ key: string; name: string; cells: React.ReactNode[] }> =
    tab === "Attendance" ? rows.map((r, i) => ({ key: r._id || `a${i}`, name: nameOf(r), cells: [r.department || "—", r.checkIn || "—", r.checkOut || "—", <Pill key="s" text={attLabel(r.attendance)} />] })) :
    tab === "Leaves" ? leaves.map((l, i) => ({ key: typeof l._id === "string" ? l._id : `l${i}`, name: leaveName(l), cells: [String(l.leaveType || "—"), `${new Date(String(l.fromDate)).toLocaleDateString("en-US", { month: "short", day: "2-digit" })} – ${new Date(String(l.toDate)).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}`, typeof l.reason === "string" && l.reason ? l.reason : "—", <Pill key="s" text={String(l.status || "pending").replace(/^./, (c) => c.toUpperCase())} />] })) :
    tab === "Employee Summary" ? rows.map((r, i) => ({ key: r._id || `e${i}`, name: nameOf(r), cells: [r.department || "—", field(r, "designation") || "—", field(r, "email") || "—", <Pill key="s" text={attLabel(r.attendance)} />] })) : [];

  const downloadReport = () => {
    if (tab === "Performance") return setNotice("Performance reports are not available from the current manager API.");
    downloadCsv(`${tab.toLowerCase().replace(/ /g, "-")}-report.csv`, [tableHead[tab], ...tableRows.map((r) => [r.name, ...r.cells.map((c) => (typeof c === "string" ? c : (c as React.ReactElement<{ text: string }>).props.text))])]);
  };

  const blank = loading ? "—" : undefined;
  const today = new Date();
  const rangeLabel = `${new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString("en-US", { month: "short", day: "2-digit" })} – ${today.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`;

  return (
    <PageShell
      crumb="Reports & Analytics"
      title="Reports & Analytics"
      subtitle="Get powerful insights about your team and organization."
      icon={BarChart3}
      actions={<><div className="flex h-10 items-center gap-2 rounded-lg border border-[#DCE6F7] bg-white px-3 text-[13px] font-semibold"><CalendarDays size={16} className="text-[#2459A6]" />{rangeLabel}</div><PrimaryButton onClick={downloadReport}><Download size={16} /> Download Report</PrimaryButton></>}
    >
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Employees" value={blank ?? total} sub="Current team size" icon={Users} tone="blue" />
        <StatCard label="Attendance Rate" value={blank ?? `${rate}%`} sub="Today (present + late)" icon={CalendarCheck2} tone="green" />
        <StatCard label="Performance Avg." value="—" sub="Not available" icon={Star} tone="orange" />
        <StatCard label="Total Leaves" value={blank ?? leaves.length} sub="All team requests" icon={Plane} tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardTitle icon={BarChart3} title="Attendance Analytics" action={<LinkButton onClick={() => navigate("/manager/team-attendance")}>View Details</LinkButton>} />
          <div className="mt-2"><Legend items={[["Present", "#2F6BEA"], ["Absent", "#F59E42"], ["Late", "#8B5CF6"]]} /></div>
          <LineChart labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} yMax={100} ticks={5} suffix="" series={[]} emptyMessage="Historical attendance data is not available from the current API." />
        </Card>
        <Card>
          <CardTitle icon={PieChart} title="Department Overview" action={<LinkButton onClick={() => navigate("/manager/organization")}>View Details</LinkButton>} />
          <div className="mt-4 flex flex-wrap items-center justify-around gap-4">
            <Donut size={150} thickness={22} segments={deptList.map(([, n], i) => ({ value: n, color: COLORS[i % COLORS.length] }))}>
              <div><p className="text-[26px] font-extrabold leading-none">{loading ? "—" : rows.length}</p><p className="mt-1 text-[12px] font-medium">Total</p></div>
            </Donut>
            <div className="space-y-2 text-[12px]">
              {deptList.map(([name, n], i) => <div key={name} className="flex items-start gap-2"><i className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} /><span><b className="block">{name}</b>{n} ({rows.length ? Math.round((n / rows.length) * 1000) / 10 : 0}%)</span></div>)}
              {deptList.length === 0 && <p className="text-[#8795AA]">No team data available.</p>}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card>
          <CardTitle icon={TrendingUp} title="Employee Performance" />
          <p className="mt-6 rounded-lg bg-[#F5F8FE] p-5 text-center text-[12px] leading-5 text-[#617492]">Department performance ratings are not available from the current manager API.</p>
        </Card>
        <Card>
          <CardTitle icon={Trophy} title="Top Performers" />
          <p className="mt-6 rounded-lg bg-[#F5F8FE] p-5 text-center text-[12px] leading-5 text-[#617492]">Top performers will appear here once performance data is available.</p>
        </Card>
        <Card>
          <CardTitle icon={CalendarDays} title="Leave Trends" />
          <LineChart labels={months.map(monthLabel)} yMax={yMax} ticks={yMax / 2} series={[{ name: "Leaves", color: "#2F6BEA", values: leaveSeries, fill: true }]} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle icon={FileText} title="Detailed Reports" action={<PrimaryButton onClick={downloadReport} outline><Download size={15} /> Export CSV</PrimaryButton>} />
          <div className="mt-3 flex gap-6 border-b border-[#E6ECF6] text-[13px]">
            {(["Attendance", "Performance", "Leaves", "Employee Summary"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`-mb-px border-b-2 pb-2 font-semibold ${tab === t ? "border-[#1F63E8] text-[#1F63E8]" : "border-transparent text-[#4B5F7D]"}`}>{t}</button>
            ))}
          </div>
          {tab === "Performance" ? (
            <p className="mt-4 rounded-lg bg-[#F5F8FE] p-6 text-center text-[13px] text-[#617492]">Performance reports are not available from the current manager API.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[13px]">
                <thead><tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]">{tableHead[tab].map((h, i, arr) => <Th key={h} first={i === 0} last={i === arr.length - 1}>{h}</Th>)}</tr></thead>
                <tbody>
                  {tableRows.slice(0, 6).map((r) => (
                    <tr key={r.key} className="border-b border-[#F0F3F8] last:border-0">
                      <td className="py-3 pl-3"><div className="flex items-center gap-2.5"><Avatar name={r.name} /><span className="font-semibold">{r.name}</span></div></td>
                      {r.cells.map((c, i) => <td key={i} className="max-w-[180px] truncate pr-3">{c}</td>)}
                    </tr>
                  ))}
                  {tableRows.length === 0 && <tr><td colSpan={5} className="h-20 text-center text-[12px] text-[#8795AA]">{loading ? "Loading report…" : "No data available."}</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <CardTitle icon={Zap} title="Quick Actions" />
          <QuickActions
            items={[
              ["Generate Report", FileText, downloadReport],
              ["Export Data", Download, downloadReport],
              ["View Analytics", BarChart3, () => navigate("/manager/performance")],
              ["Schedule Report", CalendarDays, () => navigate("/manager/schedule-report")],
            ]}
          />
        </Card>
      </div>

      {notice && <InfoModal title="Reports" message={notice} onClose={() => setNotice(null)} />}
    </PageShell>
  );
};

export default Reports;
