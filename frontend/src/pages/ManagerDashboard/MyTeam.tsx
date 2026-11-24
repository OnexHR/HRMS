import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Download,
  EllipsisVertical,
  Home,
  Plane,
  Plus,
  Search,
  Settings,
  UserCheck,
  Users,
  X,
  Zap,
  ArrowRight,
} from "lucide-react";
import employeeApi from "../../lib/employeeApi";
import type { TeamAttendanceRow, TeamAttendanceStats } from "../../types/Employee";

type TeamMember = {
  _id: string;
  name: string;
  employeeCode: string;
  role: string;
  department: string;
  email: string;
  reportingTo: string;
  attendance: "Present" | "Late" | "On Leave" | "Absent" | "Unknown";
  status: "Active" | "Inactive" | "Unknown";
  joinedAt?: string;
};

type StatCardProps = {
  label: string;
  value: number | string;
  sub: string;
  icon: React.ElementType;
  tone: "blue" | "green" | "orange" | "purple";
};

function StatCard({ label, value, sub, icon: Icon, tone }: StatCardProps) {
  const tones = {
    blue: { icon: "bg-[#E1ECFF] text-[#2F6BEA]", blob: "from-transparent to-[#DCE8FF]" },
    green: { icon: "bg-[#DDF5E8] text-[#19A463]", blob: "from-transparent to-[#D6F3E4]" },
    orange: { icon: "bg-[#FFE8D4] text-[#F28C38]", blob: "from-transparent to-[#FFE3CB]" },
    purple: { icon: "bg-[#E8E3FF] text-[#6B4EE0]", blob: "from-transparent to-[#E4DEFF]" },
  }[tone];
  return (
    <section className="relative flex min-h-[100px] items-center gap-4 overflow-hidden rounded-xl border border-[#E6ECF6] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
      <div className={`pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${tones.blob}`} />
      <div className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${tones.icon}`}>
        <Icon size={26} strokeWidth={2.2} />
      </div>
      <div className="relative min-w-0">
        <p className="truncate text-[13px] font-bold text-[#10284A]">{label}</p>
        <p className="mt-0.5 text-[30px] font-extrabold leading-none text-[#10284A]">{value}</p>
        <p className="mt-1.5 truncate text-[11px] font-medium text-[#6B7C99]">{sub}</p>
      </div>
    </section>
  );
}

function FilterSelect({ value, onChange, allLabel, options }: { value: string; onChange: (value: string) => void; allLabel: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={allLabel}
        className="h-11 w-full appearance-none rounded-lg border border-[#DCE6F7] bg-white pl-4 pr-9 text-[13px] font-semibold text-[#10284A] outline-none focus:border-[#1F63E8]"
      >
        <option value="">{allLabel}</option>
        {options.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#10284A]" />
    </div>
  );
}

// "On Leave" wins over the employment status, like the design shows.
function displayStatus(member: TeamMember) {
  if (member.attendance === "On Leave") return "On Leave";
  if (member.status !== "Unknown") return member.status;
  return member.attendance !== "Unknown" ? member.attendance : "—";
}

function statusStyle(value: string) {
  if (value === "On Leave") return { cls: "bg-[#FFF1E3] text-[#E57F1F]", dot: "bg-[#F59E42]" };
  if (value === "Inactive" || value === "Absent") return { cls: "bg-[#FFE9EA] text-[#D2444F]", dot: "bg-[#EF5B67]" };
  if (value === "Late") return { cls: "bg-[#FFF6DD] text-[#B98100]", dot: "bg-[#EAB308]" };
  if (value === "Active" || value === "Present") return { cls: "bg-[#E7F7EE] text-[#169A5F]", dot: "bg-[#22B573]" };
  return { cls: "bg-[#F1F4F8] text-[#687990]", dot: "bg-[#A3AFC2]" };
}

function StatusPill({ value }: { value: string }) {
  const style = statusStyle(value);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />{value}
    </span>
  );
}

function stringField(value: unknown, key: string) {
  return typeof value === "object" && value !== null && key in value && typeof value[key as keyof typeof value] === "string"
    ? (value[key as keyof typeof value] as string)
    : "";
}

function formatJoinDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function errorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  }
  return "Could not load team details.";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

const MyTeam: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [stats, setStats] = React.useState<TeamAttendanceStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [role, setRole] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [openMember, setOpenMember] = React.useState<TeamMember | null>(null);
  const [analyticsTab, setAnalyticsTab] = React.useState<"Attendance" | "Performance" | "Leave Trends">("Attendance");

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
        const rows = rowsResult.value.data?.rows ?? [];
        setMembers(rows.map((row, index) => {
          const name = row.name || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Team Member";
          const rowStatus = String(row.status ?? "").toLowerCase();
          const isActive = row.isActive === true || rowStatus === "active";
          const isInactive = row.isActive === false || rowStatus === "inactive";
          return {
            _id: row._id || String(index + 1),
            name,
            employeeCode: typeof row.employeeCode === "string" ? row.employeeCode : "—",
            role: typeof row.designation === "string" ? row.designation : "",
            department: row.department || "—",
            email: stringField(row, "email") || "—",
            reportingTo: "—",
            attendance: row.attendance?.toLowerCase() === "late" ? "Late" :
              row.attendance?.toLowerCase() === "leave" || row.attendance?.toLowerCase() === "on leave" ? "On Leave" :
                row.attendance?.toLowerCase() === "absent" ? "Absent" :
                  row.attendance?.toLowerCase() === "present" ? "Present" : "Unknown",
            status: isActive ? "Active" : isInactive ? "Inactive" : "Unknown",
            joinedAt: typeof row.joinDate === "string" ? row.joinDate : undefined,
          };
        }));
      }
      if (statsResult.status === "rejected" || rowsResult.status === "rejected") {
        setLoadError(errorMessage(statsResult.status === "rejected" ? statsResult.reason : rowsResult.status === "rejected" ? rowsResult.reason : null));
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const departments = Array.from(new Set(members.map((member) => member.department)));
  const roles = Array.from(new Set(members.map((member) => member.role).filter(Boolean)));
  const statusOptions = ["Active", "Inactive", "On Leave"];
  const filtered = members.filter((member) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      member.name.toLowerCase().includes(query) ||
      member.employeeCode.toLowerCase().includes(query) ||
      member.department.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query);
    return matchesSearch &&
      (!department || member.department === department) &&
      (!role || member.role === role) &&
      (!status || displayStatus(member) === status);
  });

  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const cardMembers = filtered.slice(0, 6);

  const resetPage = () => setPage(1);

  const exportTeam = () => {
    const header = ["Employee", "Employee ID", "Designation", "Department", "Email", "Joining Date", "Attendance", "Status"];
    const rows = filtered.map((member) => [
      member.name,
      member.employeeCode,
      member.role,
      member.department,
      member.email,
      member.joinedAt ?? "",
      member.attendance,
      member.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "team-members.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalMembers = stats?.total ?? members.length;
  const activeMembers = members.filter((member) => member.status === "Active").length;
  const activeStatusKnown = members.length === 0 || members.some((member) => member.status !== "Unknown");
  const onLeave = members.filter((member) => member.attendance === "On Leave").length;
  const pct = (n: number) => (totalMembers ? Math.round((n / totalMembers) * 1000) / 10 : 0);

  const joinTimes = members
    .map((member) => (member.joinedAt ? new Date(member.joinedAt).getTime() : NaN))
    .filter((time) => !Number.isNaN(time));
  const avgTenure = joinTimes.length
    ? joinTimes.reduce((sum, time) => sum + (Date.now() - time) / (365.25 * 86_400_000), 0) / joinTimes.length
    : null;

  const blank = loading || !dataLoaded;

  return (
    <div className="space-y-5 px-4 py-4 lg:px-6">
      {/* Breadcrumb + title */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-[#4B5F7D]">
            <Home size={14} className="text-[#2459A6]" />
            <button type="button" onClick={() => navigate("/manager")} className="hover:underline">Dashboard</button>
            <ChevronRight size={12} />
            <span>My Team</span>
          </nav>
          <h1 className="mt-2 text-[28px] font-extrabold leading-none tracking-tight text-[#10284A]">My Team</h1>
          <p className="mt-1.5 text-[13px] text-[#4B5F7D]">Manage and oversee your team members</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={exportTeam} className="flex h-10 items-center gap-2 rounded-lg border border-[#1F63E8] bg-white px-4 text-[13px] font-bold text-[#1F63E8] transition hover:bg-[#EEF4FF]">
            <Download size={16} /> Export Report
          </button>
          <button type="button" onClick={() => setActionNotice("Adding team members is not available in the current manager tools.")} className="flex h-10 items-center gap-2 rounded-lg bg-[#1F63E8] px-4 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(31,99,232,.3)] transition hover:bg-[#1850C0]">
            <Plus size={16} /> Add Member
          </button>
        </div>
      </div>

      {loadError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-600">{loadError}</p>}

      {/* Banner */}
      <section className="relative overflow-hidden rounded-xl border border-[#D6E3FA] bg-gradient-to-r from-[#DCE9FF] via-[#E9F1FF] to-[#D3E3FF] px-6 py-6 sm:px-8">
        <div className="pointer-events-none absolute -left-6 -bottom-8 hidden text-[#2F6BEA]/25 sm:block"><Users size={150} strokeWidth={1.4} /></div>
        <div className="relative sm:pl-48">
          <h2 className="text-[22px] font-extrabold text-[#0F2A5C]">Build a stronger team together</h2>
          <p className="mt-1.5 text-[14px] font-medium text-[#1D3A6E]">Empower your team to achieve more.</p>
        </div>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Team" value={blank ? "—" : totalMembers} sub="Current team size" icon={Users} tone="blue" />
        <StatCard label="Active Employees" value={blank || !activeStatusKnown ? "—" : activeMembers} sub={blank || !activeStatusKnown ? "Active status only" : `${pct(activeMembers)}% of team`} icon={UserCheck} tone="green" />
        <StatCard label="On Leave" value={blank ? "—" : onLeave} sub={blank ? "Today's attendance" : `${pct(onLeave)}% of team`} icon={Plane} tone="orange" />
        <StatCard label="Avg. Tenure" value={blank || avgTenure === null ? "—" : `${avgTenure.toFixed(1)} yrs`} sub="Based on join date" icon={CalendarDays} tone="purple" />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E6ECF6] bg-white p-3 shadow-[0_2px_10px_rgba(30,64,120,.05)] sm:grid-cols-3 lg:grid-cols-[minmax(240px,1.6fr)_1fr_1fr_1fr]">
        <label className="flex h-11 items-center gap-2.5 rounded-lg border border-[#DCE6F7] bg-[#F5F8FE] px-3.5 text-[#2459A6] sm:col-span-3 lg:col-span-1">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); resetPage(); }}
            placeholder="Search members by name, department..."
            className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-[#10284A] outline-none placeholder:text-[#7C8CA6]"
          />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <FilterSelect value={department} onChange={(value) => { setDepartment(value); resetPage(); }} allLabel="All Departments" options={departments} />
        <FilterSelect value={role} onChange={(value) => { setRole(value); resetPage(); }} allLabel="All Designations" options={roles} />
        <FilterSelect value={status} onChange={(value) => { setStatus(value); resetPage(); }} allLabel="All Status" options={statusOptions} />
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cardMembers.map((member) => (
          <article key={member._id} className="flex gap-4 rounded-xl border border-[#E6ECF6] bg-white p-4 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
            <div className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#DCE9FB] to-[#BFD5F7] text-[20px] font-extrabold text-[#2459A6]">{initials(member.name)}</div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div><StatusPill value={displayStatus(member)} /></div>
              <h3 className="mt-1.5 truncate text-[17px] font-extrabold text-[#10284A]">{member.name}</h3>
              <p className="truncate text-[13px] text-[#4B5F7D]">{member.role || "—"}</p>
              <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-[#6B7C99]"><Building2 size={13} />{member.department}</p>
              <button type="button" onClick={() => setOpenMember(member)} className="mt-2 inline-flex items-center gap-1 self-end rounded-md border border-[#CFE0FB] bg-[#F3F8FF] px-3 py-1 text-[11px] font-bold text-[#1F63E8] transition hover:bg-[#E6F0FF]">
                View Profile <ArrowRight size={12} />
              </button>
            </div>
          </article>
        ))}
        {cardMembers.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-[#DCE5F1] bg-white py-10 text-center text-[13px] text-[#8795AA]">
            {loading ? "Loading team members…" : "No team members match these filters."}
          </p>
        )}
      </div>

      {/* Team members table */}
      <section className="rounded-xl border border-[#E6ECF6] bg-white p-5 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
        <div className="flex items-center gap-2.5">
          <Users size={20} className="text-[#2459A6]" />
          <h2 className="text-[16px] font-extrabold text-[#10284A]">Team Members</h2>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]">
                <th className="rounded-l-md px-3 py-2.5">Name</th><th>Designation</th><th>Department</th><th>Email</th><th>Status</th><th>Joining Date</th><th className="rounded-r-md pr-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((member) => (
                <tr key={member._id} className="border-b border-[#F0F3F8] last:border-0">
                  <td className="px-3 py-3">
                    <button type="button" onClick={() => setOpenMember(member)} className="flex items-center gap-2.5 text-left">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E3EDFF] text-[11px] font-bold text-[#2459A6]">{initials(member.name)}</div>
                      <span className="font-semibold text-[#10284A]">{member.name}</span>
                    </button>
                  </td>
                  <td>{member.role || "—"}</td>
                  <td>{member.department}</td>
                  <td className="max-w-[210px] truncate pr-3">{member.email}</td>
                  <td><StatusPill value={displayStatus(member)} /></td>
                  <td>{formatJoinDate(member.joinedAt)}</td>
                  <td className="pr-3 text-center">
                    <button type="button" onClick={() => setOpenMember(member)} aria-label={`Actions for ${member.name}`} className="grid h-7 w-7 place-items-center rounded-full border border-[#E1E8F2] text-[#6F819A] transition hover:bg-[#F3F6FC]"><EllipsisVertical size={15} /></button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={7} className="h-24 text-center text-[12px] text-[#8795AA]">{loading ? "Loading team…" : "No team members match these filters."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#52688A]">
          <p>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} members</p>
          <div className="flex items-center gap-1">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page" className="grid h-8 w-8 place-items-center rounded border border-[#E1E8F2] disabled:opacity-40"><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(pageCount, 4) }, (_, i) => i + 1).map((item) => (
              <button type="button" key={item} onClick={() => setPage(item)} className={`grid h-8 w-8 place-items-center rounded ${item === currentPage ? "bg-[#1F63E8] text-white" : "border border-[#E1E8F2]"}`}>{item}</button>
            ))}
            {pageCount > 4 && <span className="px-1">…</span>}
            <button type="button" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} aria-label="Next page" className="grid h-8 w-8 place-items-center rounded border border-[#E1E8F2] disabled:opacity-40"><ChevronRight size={14} /></button>
          </div>
        </div>
      </section>

      {/* Team analytics + Quick actions */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-xl border border-[#E6ECF6] bg-white p-5 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
          <div className="flex items-center gap-2.5">
            <BarChart3 size={20} className="text-[#2459A6]" />
            <h2 className="text-[16px] font-extrabold text-[#10284A]">Team Analytics</h2>
          </div>
          <div className="mt-3 flex gap-6 border-b border-[#E6ECF6] text-[13px]">
            {(["Attendance", "Performance", "Leave Trends"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setAnalyticsTab(tab)}
                className={`-mb-px border-b-2 pb-2 font-semibold transition ${analyticsTab === tab ? "border-[#1F63E8] text-[#1F63E8]" : "border-transparent text-[#4B5F7D] hover:text-[#10284A]"}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative mt-4 h-[190px]">
            {[100, 75, 50, 25, 0].map((tick, i) => (
              <div key={tick} className="absolute left-0 right-0 flex items-center gap-3 text-[11px] text-[#7C8CA6]" style={{ top: `${i * 25}%` }}>
                <span className="w-9 -translate-y-1/2 text-right">{tick}%</span>
                <span className="h-px flex-1 -translate-y-1/2 bg-[#EDF1F7]" />
              </div>
            ))}
            <div className="absolute inset-0 grid place-items-center px-10 text-center">
              <p className="rounded-lg bg-white/90 px-4 py-2 text-[12px] text-[#8795AA]">{analyticsTab} trend data is not available from the current API.</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#E6ECF6] bg-white p-5 shadow-[0_2px_10px_rgba(30,64,120,.05)]">
          <div className="flex items-center gap-2.5">
            <Zap size={20} className="text-[#2459A6]" />
            <h2 className="text-[16px] font-extrabold text-[#10284A]">Quick Actions</h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {([
              ["Manage Attendance", CalendarCheck2, () => navigate("/manager/team-attendance")],
              ["Approve Leaves", Plane, () => navigate("/manager/leave-requests")],
              ["View Reports", BarChart3, () => navigate("/manager/reports")],
              ["Manage Organization", Settings, () => navigate("/manager/organization")],
            ] as const).map(([label, Icon, onClick]) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex h-[92px] flex-col items-center justify-center gap-2 rounded-xl border border-[#DCE6F7] bg-gradient-to-b from-[#F3F8FF] to-[#E6F0FF] px-2 text-center text-[12px] font-bold text-[#10284A] transition hover:border-[#1F63E8] hover:shadow-sm"
              >
                <Icon size={24} className="text-[#1F63E8]" />
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>

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

      {actionNotice && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#10284A]/35 p-4" onClick={() => setActionNotice(null)}>
          <section role="dialog" aria-modal="true" className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-sm font-extrabold">Team Members</h2><button type="button" onClick={() => setActionNotice(null)} aria-label="Close"><X size={17} /></button></div>
            <p className="mt-3 text-xs leading-5 text-[#52688A]">{actionNotice}</p>
            <button type="button" onClick={() => setActionNotice(null)} className="mt-4 rounded-lg bg-[#1F63E8] px-4 py-2 text-xs font-bold text-white">Okay</button>
          </section>
        </div>
      )}

      {openMember && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#10284A]/35 p-4" onClick={() => setOpenMember(null)}>
          <section role="dialog" aria-modal="true" aria-label={`${openMember.name} details`} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-[#EDF3FC] text-sm font-bold text-[#2459A6]">{initials(openMember.name)}</div>
                <div><h2 className="text-sm font-extrabold">{openMember.name}</h2><p className="mt-1 text-[11px] text-[#617492]">{openMember.role} · {openMember.department}</p></div>
              </div>
              <button type="button" onClick={() => setOpenMember(null)} aria-label="Close"><X size={18} /></button>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-[11px]">
              <div className="rounded-lg bg-[#F8FAFD] p-3"><dt className="text-[#8795AA]">Employee ID</dt><dd className="mt-1 font-bold">{openMember.employeeCode}</dd></div>
              <div className="rounded-lg bg-[#F8FAFD] p-3"><dt className="text-[#8795AA]">Status</dt><dd className="mt-1 font-bold">{displayStatus(openMember)}</dd></div>
              <div className="col-span-2 rounded-lg bg-[#F8FAFD] p-3"><dt className="text-[#8795AA]">Email</dt><dd className="mt-1 break-all font-bold">{openMember.email}</dd></div>
              <div className="rounded-lg bg-[#F8FAFD] p-3"><dt className="text-[#8795AA]">Attendance</dt><dd className="mt-1 font-bold">{openMember.attendance}</dd></div>
              <div className="rounded-lg bg-[#F8FAFD] p-3"><dt className="text-[#8795AA]">Joining Date</dt><dd className="mt-1 font-bold">{formatJoinDate(openMember.joinedAt)}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </div>
  );
};

export default MyTeam;
