import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CalendarCheck2, CalendarDays, CheckCircle2, Clock3, Download, Lightbulb, Radio, Search, UserX, Users, Zap } from "lucide-react";
import employeeApi from "../../lib/employeeApi";
import type { TeamAttendanceRow, TeamAttendanceStats } from "../../types/Employee";
import { Avatar, Card, CardTitle, DetailModal, Donut, Legend, LineChart, PageShell, Pager, Pill, PrimaryButton, QuickActions, SelectBox, StatCard, Th, downloadCsv, field } from "./ui";

type Row = TeamAttendanceRow & { employeeCode: string };

function formatHours(minutes?: number) {
  if (!minutes) return "—";
  return `${Math.floor(minutes / 60)}h ${(minutes % 60).toString().padStart(2, "0")}m`;
}
const label = (attendance?: string) => (attendance === "Leave" ? "On Leave" : attendance && attendance !== "—" ? attendance : "—");

const TeamAttendance: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [stats, setStats] = React.useState<TeamAttendanceStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<Row | null>(null);
  const [tab, setTab] = React.useState<"today" | "department" | "monthly">("today");
  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [designation, setDesignation] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    let active = true;
    const load = async () => {
      const [statsResult, rowsResult] = await Promise.allSettled([
        employeeApi.get<{ stats: TeamAttendanceStats }>("/team/attendance/stats"),
        employeeApi.get<{ rows: TeamAttendanceRow[] }>("/team/attendance/rows"),
      ]);
      if (!active) return;
      setDataLoaded(statsResult.status === "fulfilled" || rowsResult.status === "fulfilled");
      if (statsResult.status === "fulfilled") setStats(statsResult.value.data?.stats ?? null);
      if (rowsResult.status === "fulfilled") {
        setRows((rowsResult.value.data?.rows ?? []).map((row, index) => ({
          ...row,
          _id: row._id || `${typeof row.employeeCode === "string" ? row.employeeCode : "member"}-${index}`,
          name: row.name || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Team Member",
          employeeCode: typeof row.employeeCode === "string" ? row.employeeCode : "—",
          attendance: row.attendance?.toLowerCase() === "late" ? "Late" :
            row.attendance?.toLowerCase() === "absent" ? "Absent" :
              row.attendance?.toLowerCase() === "leave" || row.attendance?.toLowerCase() === "on leave" ? "Leave" :
                row.attendance?.toLowerCase() === "present" ? "Present" : "—",
        })));
      }
      if (statsResult.status === "rejected" || rowsResult.status === "rejected") setError("Could not load all team attendance data.");
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const departments = Array.from(new Set(rows.map((r) => r.department || "—")));
  const designations = Array.from(new Set(rows.map((r) => field(r, "designation")).filter(Boolean)));
  const filtered = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    return (!q || row.name?.toLowerCase().includes(q) || row.employeeCode.toLowerCase().includes(q)) &&
      (!department || (row.department || "—") === department) &&
      (!designation || field(row, "designation") === designation) &&
      (!status || label(row.attendance) === status);
  });
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);

  const total = stats?.total ?? rows.length;
  const present = stats?.present ?? rows.filter((r) => r.attendance === "Present").length;
  const late = stats?.late ?? rows.filter((r) => r.attendance === "Late").length;
  const absent = stats?.absent ?? rows.filter((r) => r.attendance === "Absent").length;
  const onLeave = stats?.onLeave ?? rows.filter((r) => r.attendance === "Leave").length;
  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const blank = loading || !dataLoaded;
  const worked = rows.map((r) => r.workingMinutes ?? 0).filter((m) => m > 0);
  const avgMinutes = worked.length ? Math.round(worked.reduce((a, b) => a + b, 0) / worked.length) : 0;
  const onTrack = pct(present) >= 85;

  const byDepartment = departments.map((name) => {
    const group = rows.filter((r) => (r.department || "—") === name);
    const count = (s: string) => group.filter((r) => r.attendance === s).length;
    return { name, total: group.length, present: count("Present"), late: count("Late"), absent: count("Absent"), leave: count("Leave") };
  });

  const exportReport = () =>
    downloadCsv("team-attendance.csv", [
      ["Employee", "Employee ID", "Department", "Check In", "Check Out", "Total Hours", "Status"],
      ...filtered.map((r) => [r.name || "", r.employeeCode, r.department || "", r.checkIn || "—", r.checkOut || "—", formatHours(r.workingMinutes), label(r.attendance)]),
    ]);

  const todayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "numeric" }).format(new Date());
  const reset = () => setPage(1);

  return (
    <PageShell
      crumb="Attendance"
      title="Attendance Management"
      subtitle="Track and manage team attendance efficiently."
      icon={CalendarCheck2}
      actions={<div className="flex h-10 items-center gap-2 rounded-lg border border-[#DCE6F7] bg-white px-3 text-[13px] font-semibold text-[#10284A]"><CalendarDays size={16} className="text-[#2459A6]" />{todayLabel}</div>}
    >
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Employees" value={blank ? "—" : total} sub="Current team size" icon={Users} tone="blue" />
        <StatCard label="Present Today" value={blank ? "—" : present} sub={blank ? "Today" : `${pct(present)}% of team`} icon={CheckCircle2} tone="green" />
        <StatCard label="Absent Today" value={blank ? "—" : absent} sub={blank ? "Today" : `${pct(absent)}% of team`} icon={UserX} tone="red" />
        <StatCard label="Late Today" value={blank ? "—" : late} sub={blank ? "Today" : `${pct(late)}% of team`} icon={Clock3} tone="orange" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle icon={BarChart3} title="Attendance Trends" />
          <div className="mt-2"><Legend items={[["Present", "#2F6BEA"], ["Absent", "#9CC3F5"]]} /></div>
          <LineChart labels={["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]} yMax={Math.max(25, total)} ticks={5} series={[]} emptyMessage="Historical attendance data is not available from the current API." />
        </Card>

        <Card>
          <CardTitle icon={Radio} title="Live Attendance" action={<Pill text="Live" tone="green" />} />
          <div className="mt-4 flex flex-wrap items-center justify-around gap-5">
            <Donut size={150} thickness={16} max={total} segments={[{ value: present, color: "#19A463" }, { value: onLeave, color: "#F59E42" }, { value: absent, color: "#EF4444" }]}>
              <div><p className="text-[24px] font-extrabold leading-none">{blank || !total ? "—" : `${pct(present)}%`}</p><p className="mt-1 text-[12px] font-medium">Present</p></div>
            </Donut>
            <div className="space-y-3 text-[13px]">
              {([["Present", present, "#19A463"], ["On Leave", onLeave, "#F59E42"], ["Absent", absent, "#EF4444"]] as const).map(([name, value, color]) => (
                <div key={name} className="grid grid-cols-[10px_72px_28px] items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /><span>{name}</span><b className="text-right">{blank ? "—" : value}</b></div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-center text-[13px] font-bold">{blank ? "—" : `${present} / ${total}`} <span className="font-medium text-[#6B7C99]">employees present</span></p>
          {!blank && total > 0 && (
            <p className={`mt-3 flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold ${onTrack ? "bg-[#E7F7EE] text-[#169A5F]" : "bg-[#FFF1E3] text-[#E57F1F]"}`}>
              <CheckCircle2 size={15} />{onTrack ? "Attendance is on track!" : "Attendance needs attention"}
            </p>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6ECF6] pb-0">
          <div className="flex gap-6 text-[13px]">
            {([["today", "Today's Attendance"], ["department", "Department View"], ["monthly", "Monthly Report"]] as const).map(([key, name]) => (
              <button key={key} type="button" onClick={() => setTab(key)} className={`-mb-px border-b-2 pb-2.5 font-semibold transition ${tab === key ? "border-[#1F63E8] text-[#1F63E8]" : "border-transparent text-[#4B5F7D] hover:text-[#10284A]"}`}>{name}</button>
            ))}
          </div>
          <div className="pb-2"><PrimaryButton onClick={exportReport} outline><Download size={16} /> Export Report</PrimaryButton></div>
        </div>

        {tab === "today" && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <SelectBox value={department} onChange={(v) => { setDepartment(v); reset(); }} allLabel="All Departments" options={departments} />
              <SelectBox value={designation} onChange={(v) => { setDesignation(v); reset(); }} allLabel="All Designations" options={designations} />
              <SelectBox value={status} onChange={(v) => { setStatus(v); reset(); }} allLabel="All Status" options={["Present", "Late", "Absent", "On Leave"]} />
              <label className="ml-auto flex h-10 min-w-[200px] items-center gap-2 rounded-lg border border-[#DCE6F7] px-3 text-[#2459A6]">
                <Search size={15} /><input value={search} onChange={(e) => { setSearch(e.target.value); reset(); }} placeholder="Search employee..." className="min-w-0 flex-1 bg-transparent text-[13px] text-[#10284A] outline-none placeholder:text-[#7C8CA6]" />
              </label>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table id="team-attendance-records" className="w-full min-w-[820px] text-left text-[13px]">
                <thead><tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]"><Th first>Employee</Th><Th>Department</Th><Th>Designation</Th><Th>Check In</Th><Th>Check Out</Th><Th>Status</Th><Th last>Action</Th></tr></thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row._id} className="border-b border-[#F0F3F8] last:border-0">
                      <td className="py-3 pl-3"><div className="flex items-center gap-2.5"><Avatar name={row.name || "Team Member"} /><span className="font-semibold">{row.name}</span></div></td>
                      <td>{row.department || "—"}</td>
                      <td>{field(row, "designation") || "—"}</td>
                      <td>{row.checkIn || "—"}</td>
                      <td>{row.checkOut || "—"}</td>
                      <td><Pill text={label(row.attendance)} /></td>
                      <td className="pr-3"><button type="button" onClick={() => setDetail(row)} className="rounded-md border border-[#CFE0FB] px-4 py-1 text-[12px] font-bold text-[#1F63E8] hover:bg-[#EEF4FF]">View</button></td>
                    </tr>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={7} className="h-24 text-center text-[12px] text-[#8795AA]">{loading ? "Loading attendance…" : "No attendance records match these filters."}</td></tr>}
                </tbody>
              </table>
            </div>
            <Pager page={current} pages={pages} setPage={setPage} label={`Showing ${filtered.length ? (current - 1) * pageSize + 1 : 0}–${Math.min(current * pageSize, filtered.length)} of ${filtered.length} employees`} />
          </>
        )}

        {tab === "department" && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead><tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]"><Th first>Department</Th><Th>Total</Th><Th>Present</Th><Th>Late</Th><Th>Absent</Th><Th last>On Leave</Th></tr></thead>
              <tbody>
                {byDepartment.map((d) => <tr key={d.name} className="border-b border-[#F0F3F8] last:border-0"><td className="py-3 pl-3 font-semibold">{d.name}</td><td>{d.total}</td><td>{d.present}</td><td>{d.late}</td><td>{d.absent}</td><td className="pr-3">{d.leave}</td></tr>)}
                {byDepartment.length === 0 && <tr><td colSpan={6} className="h-24 text-center text-[12px] text-[#8795AA]">No department data available.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {tab === "monthly" && <p className="mt-4 rounded-lg bg-[#F5F8FE] p-6 text-center text-[13px] text-[#617492]">Monthly attendance reports are not available from the current API.</p>}
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardTitle icon={Lightbulb} title="Attendance Insights" />
          <div className="mt-4 grid grid-cols-1 items-center gap-5 sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <Donut size={104} thickness={10} max={100} segments={[{ value: blank ? 0 : pct(present + late), color: "#1F63E8" }]}>
                <p className="text-[18px] font-extrabold">{blank || !total ? "—" : `${pct(present + late)}%`}</p>
              </Donut>
              <p className="mt-2 text-[12px] font-bold">Overall Attendance</p>
            </div>
            <div className="text-center"><p className="text-[26px] font-extrabold text-[#E57F1F]">{blank ? "—" : late}</p><p className="mt-1 text-[12px] text-[#4B5F7D]">Late arrivals today</p></div>
            <div className="text-center"><p className="text-[26px] font-extrabold text-[#10284A]">{blank || !avgMinutes ? "—" : formatHours(avgMinutes)}</p><p className="mt-1 text-[12px] text-[#4B5F7D]">Avg. working hours</p></div>
          </div>
        </Card>
        <Card>
          <CardTitle icon={Zap} title="Quick Actions" />
          <QuickActions
            items={[
              ["Mark Attendance", CheckCircle2, () => navigate("/manager/mark-attendance")],
              ["View Calendar", CalendarDays, () => navigate("/manager/attendance-calendar")],
              ["Download Report", Download, exportReport],
              ["Manage Shifts", CalendarCheck2, () => navigate("/manager/manage-shifts")],
            ]}
          />
        </Card>
      </div>

      {detail && (
        <DetailModal
          title={detail.name || "Team Member"}
          subtitle={`${field(detail, "designation") || "—"} · ${detail.department || "—"}`}
          onClose={() => setDetail(null)}
          rows={[["Employee ID", detail.employeeCode], ["Status", label(detail.attendance)], ["Check In", detail.checkIn || "—"], ["Check Out", detail.checkOut || "—"], ["Total Hours", formatHours(detail.workingMinutes)], ["Department", detail.department || "—"]]}
        />
      )}
    </PageShell>
  );
};

export default TeamAttendance;
