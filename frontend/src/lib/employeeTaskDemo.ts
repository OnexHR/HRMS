export type DemoEmployeeTaskStatus =
  | "Not Started"
  | "In Progress"
  | "On Hold"
  | "Pending"
  | "Completed";

export function formatWorkId(id?: string | null) {
  return id?.replace(/^TSK(?=\d+$)/i, "WRK") ?? id;
}

export type DemoEmployeeTask = {
  _id: string;
  taskId: string;
  title: string;
  description: string;
  dueDate: string;
  attachments: string[];
  priority: "High" | "Medium" | "Low";
  status: DemoEmployeeTaskStatus;
};

export const DEMO_EMPLOYEE_TASKS: DemoEmployeeTask[] = [
  {
    _id: "demo-task-001",
    taskId: "WRK001",
    title: "Complete quarterly project report",
    description: "Compile progress, milestones, and outcomes for the quarterly review.",
    dueDate: "2026-11-25",
    attachments: [],
    priority: "High",
    status: "In Progress",
  },
  {
    _id: "demo-task-002",
    taskId: "WRK002",
    title: "Prepare client presentation",
    description: "Prepare the slides and supporting notes for the upcoming client meeting.",
    dueDate: "2026-11-27",
    attachments: [],
    priority: "Medium",
    status: "Pending",
  },
  {
    _id: "demo-task-003",
    taskId: "WRK003",
    title: "Review onboarding documents",
    description: "Check the latest onboarding documents and share any required changes.",
    dueDate: "2026-11-29",
    attachments: [],
    priority: "Low",
    status: "Not Started",
  },
  {
    _id: "demo-task-004",
    taskId: "WRK004",
    title: "Update policy documentation",
    description: "Review the policy pages and update sections assigned by the manager.",
    dueDate: "2026-11-24",
    attachments: [],
    priority: "High",
    status: "On Hold",
  },
  {
    _id: "demo-task-005",
    taskId: "WRK005",
    title: "Submit weekly work log",
    description: "Record completed work and handoffs for this week.",
    dueDate: "2026-11-20",
    attachments: [],
    priority: "Low",
    status: "Completed",
  },
];

export const getDemoTaskSummary = (
  tasks: readonly Pick<DemoEmployeeTask, "status">[] = DEMO_EMPLOYEE_TASKS,
) => ({
  totalTasks: tasks.length,
  notStarted: tasks.filter((task) => task.status === "Not Started").length,
  completed: tasks.filter((task) => task.status === "Completed").length,
  inProgress: tasks.filter((task) => task.status === "In Progress").length,
  onHold: tasks.filter((task) => task.status === "On Hold").length,
  pending: tasks.filter((task) => task.status === "Pending").length,
  workingMinutes: 205,
  breakMinutes: 30,
  overtimeMinutes: 0,
  meetingsCount: 2,
});
