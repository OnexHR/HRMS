import ActivityLog from "../../models/employee/ActivityLog.js";
import Task from "../../models/employee/Task.js";

export async function logActivity(employeeId, type, meta = {}) {
  if (!employeeId) return null;
  return ActivityLog.create({ employee: employeeId, type, at: new Date(), meta });
}

export async function recentActivity(employeeId, limit = 15) {
  const [logs, tasks] = await Promise.all([
    ActivityLog.find({ employee: employeeId })
      .sort({ at: -1 })
      .limit(limit)
      .lean(),
    Task.find({ assignedTo: employeeId })
      .populate("assignedBy", "firstName lastName")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  const taskActivities = tasks.map((task) => ({
    type: "task_assigned",
    at: task.createdAt,
    meta: {},
  }));

  return [...logs, ...taskActivities]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit);
}
