import React from "react";
import { Clock3, Plus, Users2 } from "lucide-react";
import { Card, CardTitle, PageShell, Pill, StatCard } from "../ui";

type Shift = { id: number; name: string; time: string; members: number; status: string };

const INITIAL_SHIFTS: Shift[] = [
  { id: 1, name: "Morning Shift", time: "09:00 – 18:00", members: 12, status: "Active" },
  { id: 2, name: "General Shift", time: "10:00 – 19:00", members: 8, status: "Active" },
  { id: 3, name: "Evening Shift", time: "14:00 – 23:00", members: 5, status: "Active" },
  { id: 4, name: "Weekend Shift", time: "09:00 – 17:00", members: 3, status: "Inactive" },
];

const ManageShifts: React.FC = () => {
  const [shifts] = React.useState<Shift[]>(INITIAL_SHIFTS);

  return (
    <PageShell crumb="Manage Shifts" title="Manage Shifts" subtitle="Configure and review working shifts for your team." icon={Clock3}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Shifts" value={shifts.length} sub="Configured shifts" icon={Clock3} tone="blue" />
        <StatCard label="Active Shifts" value={shifts.filter((s) => s.status === "Active").length} sub="Currently in use" icon={Users2} tone="green" />
        <StatCard label="Employees Assigned" value={shifts.reduce((sum, s) => sum + s.members, 0)} sub="Across all shifts" icon={Users2} tone="purple" />
      </div>

      <Card>
        <CardTitle icon={Plus} title="Shift schedule" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]">
                <th className="rounded-l-md px-3 py-2.5">Shift name</th><th>Timings</th><th>Members</th><th className="rounded-r-md pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id} className="border-b border-[#F0F3F8] last:border-0">
                  <td className="px-3 py-3 font-semibold">{shift.name}</td>
                  <td>{shift.time}</td>
                  <td>{shift.members}</td>
                  <td className="pr-3"><Pill text={shift.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
};

export default ManageShifts;
