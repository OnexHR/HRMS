import React from "react";
import { useNavigate } from "react-router-dom";
import { Building2, FileText, History, Network, Pencil, Plane, Settings, ShieldCheck, UserPlus, Users, Zap } from "lucide-react";
import employeeApi from "../../lib/employeeApi";
import { useEmployeeAuth } from "../../contexts/EmployeeAuthContext";
import type { ManagerDashboardData, TeamAttendanceRow, TeamAttendanceStats } from "../../types/Employee";
import { Avatar, Card, CardTitle, InfoModal, LinkButton, PageShell, PrimaryButton, QuickActions, StatCard, Th } from "./ui";

const BAR_COLORS = ["#2F6BEA", "#8B5CF6", "#22B573", "#F59E42", "#14B8A6", "#EF5B67"];
const ROLES = [
  ["Super Admin", "Full access to all features"],
  ["Manager", "Manage team and reports"],
  ["Employee", "Access to personal data"],
];

const Organization: React.FC = () => {
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  const [rows, setRows] = React.useState<TeamAttendanceRow[]>([]);
  const [stats, setStats] = React.useState<TeamAttendanceStats | null>(null);
  const [alerts, setAlerts] = React.useState<NonNullable<ManagerDashboardData["alerts"]>>([]);
  const [loading, setLoading] = React.useState(true);
  const [notice, setNotice] = React.useState<string | null>(null);

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
      if (d.status === "fulfilled") setAlerts(d.value.data?.alerts ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const managerName = `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`.trim() || "Manager";
  const total = stats?.total ?? rows.length;
  const groups = Object.entries(rows.reduce<Record<string, TeamAttendanceRow[]>>((acc, row) => { (acc[row.department || "Others"] ??= []).push(row); return acc; }, {})).sort((a, b) => b[1].length - a[1].length);
  const nameOf = (row: TeamAttendanceRow) => row.name || [row.firstName, row.lastName].filter(Boolean).join(" ") || "Team Member";
  const blank = loading ? "—" : undefined;

  return (
    <PageShell
      crumb="Organization"
      title="Organization Management"
      subtitle="Manage your organization structure, departments and settings."
      icon={Building2}
      actions={<PrimaryButton onClick={() => setNotice("Editing the organization is not available in the current manager tools.")} outline><Pencil size={15} /> Edit Organization</PrimaryButton>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Employees" value={blank ?? total} sub="Current team size" icon={Users} tone="blue" />
        <StatCard label="Departments" value={blank ?? groups.length} sub="From team records" icon={Building2} tone="blue" />
        <StatCard label="Present Today" value={blank ?? (stats?.present ?? 0)} sub="Today's attendance" icon={ShieldCheck} tone="green" />
        <StatCard label="On Leave" value={blank ?? (stats?.onLeave ?? 0)} sub="Today's attendance" icon={Plane} tone="orange" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle icon={Network} title="Organization Structure" action={<LinkButton onClick={() => navigate("/manager/team-members")}>View My Team</LinkButton>} />
          <div className="mt-5 flex flex-col items-center">
            <div className="flex items-center gap-3 rounded-xl border border-[#CFE0FB] bg-[#F3F8FF] px-5 py-3 shadow-sm">
              <Avatar name={managerName} size={44} />
              <div><p className="text-[15px] font-extrabold">{managerName}</p><p className="text-[12px] text-[#617492]">Manager</p></div>
            </div>
            {groups.length > 0 && <div className="h-6 w-px bg-[#9DB8E6]" />}
            <div className="relative w-full">
              {groups.length > 1 && <div className="absolute left-[12.5%] right-[12.5%] top-0 h-px bg-[#9DB8E6]" />}
              <div className="grid gap-3 pt-3" style={{ gridTemplateColumns: `repeat(${Math.min(Math.max(groups.length, 1), 4)}, minmax(0, 1fr))` }}>
                {groups.slice(0, 4).map(([name, members]) => (
                  <div key={name} className="flex flex-col items-center rounded-xl border border-[#E1EAF8] bg-[#F8FAFD] p-3 text-center">
                    <p className="text-[13px] font-extrabold">{name}</p>
                    <p className="text-[11px] text-[#617492]">{members.length} {members.length === 1 ? "member" : "members"}</p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {members.slice(0, 2).map((m, i) => <span key={i} className="truncate rounded-full bg-white px-3 py-1 text-[11px] text-[#4B5F7D] shadow-sm">{nameOf(m)}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {groups.length === 0 && <p className="mt-4 text-[12px] text-[#8795AA]">{loading ? "Loading structure…" : "No team data available."}</p>}
          </div>
        </Card>

        <Card>
          <CardTitle icon={Building2} title="Departments" action={<LinkButton onClick={() => navigate("/manager/team-members")}>View All</LinkButton>} />
          <div className="mt-4 space-y-4">
            {groups.slice(0, 6).map(([name, members], i) => {
              const pct = rows.length ? Math.round((members.length / rows.length) * 1000) / 10 : 0;
              return (
                <div key={name} className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div><p className="text-[13px] font-bold">{name}</p><div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EEF2F7]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} /></div><p className="mt-0.5 text-[10px] text-[#8795AA]">{members.length} {members.length === 1 ? "Employee" : "Employees"}</p></div>
                  <b className="text-[13px]">{pct}%</b>
                </div>
              );
            })}
            {groups.length === 0 && <p className="text-[12px] text-[#8795AA]">No department data available.</p>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardTitle icon={Building2} title="Company Information" action={<PrimaryButton onClick={() => setNotice("Editing company information is not available in the current manager tools.")} outline><Pencil size={14} /> Edit</PrimaryButton>} />
          <dl className="mt-4 space-y-3 text-[13px]">
            {([["Company", "—"], ["Industry", "—"], ["Location", "—"], ["Total Employees", loading ? "—" : String(total)]] as const).map(([k, v]) => <div key={k} className="grid grid-cols-[130px_1fr]"><dt className="text-[#617492]">{k}</dt><dd className="font-semibold">{v}</dd></div>)}
          </dl>
          <p className="mt-4 rounded-lg bg-[#F5F8FE] p-3 text-[12px] text-[#617492]">Company details are not available from the current manager API.</p>
        </Card>
        <Card>
          <CardTitle icon={ShieldCheck} title="Roles & Permissions" action={<LinkButton onClick={() => setNotice("Role management is not available in the current manager tools.")}>Manage Roles</LinkButton>} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead><tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]"><Th first>Role</Th><Th last>Description</Th></tr></thead>
              <tbody>{ROLES.map(([role, desc]) => <tr key={role} className="border-b border-[#F0F3F8] last:border-0"><td className="py-3 pl-3 font-semibold">{role}</td><td className="pr-3">{desc}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardTitle icon={History} title="Recent Activity" />
          <ul className="mt-3">
            {alerts.slice(0, 4).map((alert, i) => (
              <li key={`${alert.category}-${i}`} className="flex items-center gap-3 border-b border-[#F0F3F8] py-2.5 text-[13px] last:border-0">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#1F63E8]" /><span className="min-w-0 flex-1 truncate">{alert.text}</span><span className="shrink-0 text-[11px] text-[#8795AA]">{alert.time}</span>
              </li>
            ))}
            {alerts.length === 0 && <li className="py-6 text-center text-[12px] text-[#8795AA]">{loading ? "Loading activity…" : "No recent activity is available."}</li>}
          </ul>
        </Card>
        <Card>
          <CardTitle icon={Zap} title="Quick Actions" />
          <QuickActions
            items={[
              ["Add Employee", UserPlus, () => navigate("/manager/add-employee")],
              ["Manage Teams", Users, () => navigate("/manager/team-members")],
              ["Organization Settings", Settings, () => navigate("/manager/profile-settings")],
              ["View Reports", FileText, () => navigate("/manager/reports")],
            ]}
          />
        </Card>
      </div>

      {notice && <InfoModal title="Organization" message={notice} onClose={() => setNotice(null)} />}
    </PageShell>
  );
};

export default Organization;
