import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, ClipboardList, Download, Goal, Settings, Star, Target, TrendingUp, Trophy, Users, Zap, CalendarDays } from "lucide-react";
import { Avatar, Card, CardTitle, Donut, InfoModal, Legend, LineChart, LinkButton, PageShell, Pill, PrimaryButton, QuickActions, StatCard, Th, downloadCsv } from "./ui";

type Range = "Last 6 Months" | "Last 3 Months";

// Sample data: no performance API is configured for managers yet.
const trends = {
  months: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"],
  scores: [78, 81, 84, 87, 89, 92],
};

const team = [
  { name: "Aarav Sharma", department: "Engineering", role: "Frontend Developer", score: 95, delta: 5 },
  { name: "Priya Singh", department: "Product", role: "Product Manager", score: 93, delta: 3 },
  { name: "Rohan Mehta", department: "Engineering", role: "Backend Developer", score: 91, delta: 2 },
  { name: "Sneha Verma", department: "Design", role: "UI/UX Designer", score: 88, delta: 1 },
  { name: "Aditya Kumar", department: "Engineering", role: "Full Stack Developer", score: 87, delta: 2 },
];

const reviews = [
  { name: "Aarav Sharma", period: "Jan – Jun 2025", status: "Completed" },
  { name: "Priya Singh", period: "Jan – Jun 2025", status: "Completed" },
  { name: "Rohan Mehta", period: "Jul – Dec 2025", status: "In Progress" },
  { name: "Sneha Verma", period: "Jul – Dec 2025", status: "Not Started" },
];

function Sparkline({ score, delta }: { score: number; delta: number }) {
  const values = [score - delta * 3, score - delta * 2, score - delta * 2.4, score - delta, score - delta * 0.6, score];
  const min = Math.min(...values), max = Math.max(...values);
  const pts = values.map((v, i) => `${(i / 5) * 70},${22 - ((v - min) / (max - min || 1)) * 18}`).join(" ");
  return <svg width="74" height="26" viewBox="0 0 74 26" aria-hidden><polyline points={pts} fill="none" stroke="#22B573" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

const Performance: React.FC = () => {
  const navigate = useNavigate();
  const [info, setInfo] = React.useState<string | null>(null);
  const [range, setRange] = React.useState<Range>("Last 6 Months");
  const count = range === "Last 6 Months" ? 6 : 3;
  const labels = trends.months.slice(-count);
  const scores = trends.scores.slice(-count);
  const overall = scores[scores.length - 1];

  const generateReport = () =>
    downloadCsv("team-performance-report.csv", [
      ["Employee", "Department", "Designation", "Performance Score"],
      ...team.map((m) => [m.name, m.department, m.role, `${m.score}%`]),
    ]);

  return (
    <PageShell
      crumb="Performance"
      title="Performance Management"
      subtitle="Track performance, set goals and help your team grow."
      icon={Trophy}
      actions={<PrimaryButton onClick={generateReport}><Download size={16} /> Generate Report</PrimaryButton>}
    >
      <p className="rounded-lg bg-[#FFF6DD] px-4 py-2 text-[12px] font-semibold text-[#8A6100]">Performance figures on this page are sample data; no performance API is configured.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Employees" value={24} sub="Sample data" icon={Users} tone="blue" />
        <StatCard label="Avg. Performance" value="4.2" sub="Sample data" icon={Star} tone="orange" />
        <StatCard label="Goals Achieved" value="92%" sub="Sample data" icon={Target} tone="red" />
        <StatCard label="Top Performers" value={8} sub="Sample data" icon={BarChart3} tone="blue" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle
            icon={BarChart3}
            title="Performance Trends"
            action={<select value={range} onChange={(e) => setRange(e.target.value as Range)} aria-label="Range" className="h-9 rounded-lg border border-[#DCE6F7] bg-white px-3 text-[12px] font-semibold outline-none"><option>Last 6 Months</option><option>Last 3 Months</option></select>}
          />
          <div className="mt-2 flex justify-end"><Legend items={[["Avg Performance", "#1F63E8"]]} /></div>
          <LineChart labels={labels} yMin={60} yMax={100} ticks={4} suffix="%" dashed={85} series={[{ name: "Avg Performance", color: "#1F63E8", values: scores, fill: true }]} />
        </Card>

        <Card>
          <CardTitle icon={Trophy} title="Performance Distribution" />
          <div className="mt-5 flex flex-wrap items-center justify-around gap-5">
            <Donut size={160} thickness={24} segments={[{ value: 45, color: "#22B573" }, { value: 40, color: "#2F6BEA" }, { value: 15, color: "#F59E42" }]}>
              <div><p className="text-[26px] font-extrabold leading-none">{overall}%</p><p className="mt-1 text-[11px] font-medium">Overall<br />Performance</p></div>
            </Donut>
            <div className="space-y-3 text-[12px]">
              {([["Excellent", "90–100%", "45%", "#22B573"], ["Good", "70–89%", "40%", "#2F6BEA"], ["Needs Improvement", "<70%", "15%", "#F59E42"]] as const).map(([name, range2, pct, color]) => (
                <div key={name} className="grid grid-cols-[10px_1fr_auto] items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /><span><b className="block">{name}</b><small className="text-[#8795AA]">{range2}</small></span><b>{pct}</b></div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle icon={Users} title="Team Performance" action={<LinkButton onClick={() => navigate("/manager/team-members")}>View All</LinkButton>} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead><tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]"><Th first>Employee</Th><Th>Department</Th><Th>Designation</Th><Th>Performance</Th><Th last>Trend</Th></tr></thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.name} className="border-b border-[#F0F3F8] last:border-0">
                    <td className="py-3 pl-3"><div className="flex items-center gap-2.5"><Avatar name={m.name} /><span className="font-semibold">{m.name}</span></div></td>
                    <td>{m.department}</td><td>{m.role}</td>
                    <td><b>{m.score}%</b> <span className="ml-1 text-[11px] font-bold text-[#169A5F]">↑ +{m.delta}%</span></td>
                    <td className="pr-3"><Sparkline score={m.score} delta={m.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle icon={Target} title="Goals Overview" action={<LinkButton onClick={() => navigate("/manager/goals-tasks")}>View All</LinkButton>} />
          <div className="mt-4 flex flex-wrap items-center justify-around gap-4">
            <Donut size={140} thickness={16} segments={[{ value: 75, color: "#22B573" }, { value: 15, color: "#2F6BEA" }, { value: 10, color: "#F59E42" }]}>
              <div><p className="text-[24px] font-extrabold leading-none">75%</p><p className="mt-1 text-[11px] font-medium">Goals<br />On Track</p></div>
            </Donut>
            <div className="space-y-2 text-[12px]">
              {([["On Track", "75%", "#22B573"], ["At Risk", "15%", "#2F6BEA"], ["Off Track", "10%", "#F59E42"]] as const).map(([name, pct, color]) => (
                <div key={name} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /><span className="w-16">{name}</span><b>{pct}</b></div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle icon={CalendarDays} title="Performance Reviews" action={<LinkButton onClick={() => setInfo("Performance reviews are not available in the current manager tools.")}>View All</LinkButton>} />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead><tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]"><Th first>Employee</Th><Th>Review Period</Th><Th>Status</Th><Th last>Action</Th></tr></thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.name} className="border-b border-[#F0F3F8] last:border-0">
                    <td className="py-3 pl-3"><div className="flex items-center gap-2.5"><Avatar name={r.name} /><span className="font-semibold">{r.name}</span></div></td>
                    <td>{r.period}</td><td><Pill text={r.status} /></td>
                    <td className="pr-3"><button type="button" onClick={() => setInfo("Performance reviews are not available in the current manager tools.")} className="rounded-md border border-[#CFE0FB] px-4 py-1 text-[12px] font-bold text-[#1F63E8] hover:bg-[#EEF4FF]">View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardTitle icon={Zap} title="Quick Actions" />
          <QuickActions
            items={[
              ["Set Goals", Goal, () => navigate("/manager/goals-tasks")],
              ["Request Review", ClipboardList, () => navigate("/manager/request-review")],
              ["View Reports", TrendingUp, () => navigate("/manager/reports")],
              ["Manage OKRs", Settings, () => navigate("/manager/goals-tasks")],
            ]}
          />
        </Card>
      </div>

      {info && <InfoModal title="Performance" message={info} onClose={() => setInfo(null)} />}
    </PageShell>
  );
};

export default Performance;
