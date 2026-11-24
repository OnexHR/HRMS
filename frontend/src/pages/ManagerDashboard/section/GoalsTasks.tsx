import React from "react";
import { CheckCircle2, Clock3, ListTodo, Plus, Target } from "lucide-react";
import { Card, CardTitle, PageShell, Pill, StatCard } from "../ui";

type Goal = {
  id: number;
  title: string;
  owner: string;
  due: string;
  status: "On Track" | "In Progress" | "At Risk" | "Completed";
};

const INITIAL_GOALS: Goal[] = [
  { id: 1, title: "Complete Q4 performance reviews", owner: "Ayesha Khan", due: "Dec 20, 2026", status: "In Progress" },
  { id: 2, title: "Onboard 3 new team members", owner: "Rahul Verma", due: "Dec 15, 2026", status: "On Track" },
  { id: 3, title: "Reduce average leave approval time", owner: "Priya Sharma", due: "Dec 31, 2026", status: "At Risk" },
  { id: 4, title: "Publish team attendance SOP", owner: "Manager", due: "Nov 30, 2026", status: "Completed" },
];

const GoalsTasks: React.FC = () => {
  const [goals, setGoals] = React.useState<Goal[]>(INITIAL_GOALS);
  const [title, setTitle] = React.useState("");
  const [owner, setOwner] = React.useState("");

  const addGoal = () => {
    if (!title.trim()) return;
    setGoals((current) => [
      ...current,
      { id: Date.now(), title: title.trim(), owner: owner.trim() || "Unassigned", due: "—", status: "On Track" },
    ]);
    setTitle("");
    setOwner("");
  };

  const toggle = (id: number) =>
    setGoals((current) =>
      current.map((goal) =>
        goal.id === id ? { ...goal, status: goal.status === "Completed" ? "In Progress" : "Completed" } : goal,
      ),
    );

  return (
    <PageShell crumb="Goals & Tasks" title="Goals & Tasks" subtitle="Set, track and manage goals and OKRs for your team." icon={Target}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Goals" value={goals.length} sub="For this quarter" icon={Target} tone="blue" />
        <StatCard label="In Progress" value={goals.filter((g) => g.status === "In Progress").length} sub="Actively being worked on" icon={Clock3} tone="purple" />
        <StatCard label="On Track" value={goals.filter((g) => g.status === "On Track").length} sub="Meeting expectations" icon={CheckCircle2} tone="green" />
        <StatCard label="Completed" value={goals.filter((g) => g.status === "Completed").length} sub="Finished this quarter" icon={ListTodo} tone="orange" />
      </div>

      <Card>
        <CardTitle icon={Plus} title="Add a new goal" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px_auto]">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Goal title"
            className="h-10 rounded-lg border border-[#DCE6F7] px-3 text-[13px] text-[#10284A] outline-none focus:border-[#1F63E8]"
          />
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Owner"
            className="h-10 rounded-lg border border-[#DCE6F7] px-3 text-[13px] text-[#10284A] outline-none focus:border-[#1F63E8]"
          />
          <button
            type="button"
            onClick={addGoal}
            className="h-10 rounded-lg bg-[#1F63E8] px-5 text-[13px] font-bold text-white transition hover:bg-[#1850C0]"
          >
            Add Goal
          </button>
        </div>
      </Card>

      <Card>
        <CardTitle icon={ListTodo} title="Goal tracker" />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]">
                <th className="rounded-l-md px-3 py-2.5">Goal</th><th>Owner</th><th>Due date</th><th>Status</th><th className="rounded-r-md pr-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((goal) => (
                <tr key={goal.id} className="border-b border-[#F0F3F8] last:border-0">
                  <td className="px-3 py-3 font-semibold text-[#10284A]">{goal.title}</td>
                  <td>{goal.owner}</td>
                  <td>{goal.due}</td>
                  <td><Pill text={goal.status} /></td>
                  <td className="pr-3 text-center">
                    <button type="button" onClick={() => toggle(goal.id)} className="rounded-md border border-[#CFE0FB] bg-[#F3F8FF] px-3 py-1 text-[11px] font-bold text-[#1F63E8] hover:bg-[#E6F0FF]">
                      {goal.status === "Completed" ? "Reopen" : "Complete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
};

export default GoalsTasks;
