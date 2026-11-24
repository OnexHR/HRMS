import React from "react";
import { CalendarCheck2, CheckCircle2, Save, Users2 } from "lucide-react";
import { Avatar, Card, CardTitle, PageShell, Pill, SelectBox, StatCard } from "../ui";

type Member = { id: string; name: string; department: string; status: string };

const INITIAL_MEMBERS: Member[] = [
  { id: "1", name: "Ayesha Khan", department: "Engineering", status: "Present" },
  { id: "2", name: "Rahul Verma", department: "Design", status: "Present" },
  { id: "3", name: "Priya Sharma", department: "HR", status: "On Leave" },
  { id: "4", name: "Vikram Singh", department: "Engineering", status: "Absent" },
];

const MarkAttendance: React.FC = () => {
  const [members, setMembers] = React.useState<Member[]>(INITIAL_MEMBERS);
  const [filter, setFilter] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const setStatus = (id: string, status: string) => {
    setSaved(false);
    setMembers((current) => current.map((m) => (m.id === id ? { ...m, status } : m)));
  };

  return (
    <PageShell crumb="Mark Attendance" title="Mark Attendance" subtitle="Review and record attendance for your team members." icon={CalendarCheck2}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Members" value={members.length} sub="In your team" icon={Users2} tone="blue" />
        <StatCard label="Present" value={members.filter((m) => m.status === "Present").length} sub="Marked present" icon={CheckCircle2} tone="green" />
        <StatCard label="On Leave" value={members.filter((m) => m.status === "On Leave").length} sub="Approved leave" icon={CalendarCheck2} tone="orange" />
      </div>

      <Card>
        <CardTitle
          icon={CalendarCheck2}
          title="Team attendance"
          action={<SelectBox value={filter} onChange={setFilter} allLabel="All Departments" options={Array.from(new Set(members.map((m) => m.department)))} />}
        />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[13px]">
            <thead>
              <tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]">
                <th className="rounded-l-md px-3 py-2.5">Employee</th><th>Department</th><th>Current status</th><th className="rounded-r-md pr-3">Update</th>
              </tr>
            </thead>
            <tbody>
              {members.filter((m) => !filter || m.department === filter).map((m) => (
                <tr key={m.id} className="border-b border-[#F0F3F8] last:border-0">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5"><Avatar name={m.name} /><span className="font-semibold">{m.name}</span></div>
                  </td>
                  <td>{m.department}</td>
                  <td><Pill text={m.status} /></td>
                  <td className="pr-3">
                    <select
                      value={m.status}
                      onChange={(e) => setStatus(m.id, e.target.value)}
                      className="h-9 rounded-lg border border-[#DCE6F7] px-2 text-[12px] outline-none focus:border-[#1F63E8]"
                    >
                      {["Present", "Absent", "On Leave", "Late", "Half Day"].map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={() => setSaved(true)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1F63E8] px-5 text-[13px] font-bold text-white hover:bg-[#1850C0]">
            <Save size={16} /> Save Attendance
          </button>
          {saved && <span className="text-[12px] font-semibold text-green-600">Attendance saved for the selected members.</span>}
        </div>
      </Card>
    </PageShell>
  );
};

export default MarkAttendance;
