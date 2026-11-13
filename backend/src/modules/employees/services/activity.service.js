import ActivityLog from '../models/activity-log.model.js'
import Task from '../../tasks/models/task.model.js'

export async function logActivity(organizationId, employeeId, type, meta = {}) {
  if (!employeeId || !organizationId) return null
  return ActivityLog.create({
    organization: organizationId,
    employee: employeeId,
    type,
    at: new Date(),
    meta,
  })
}

/**
 * Activity feed combines explicit log entries with newly assigned tasks, so the
 * employee dashboard reflects work that was assigned before logging existed.
 */
export async function recentActivity(organizationId, employeeId, limit = 15) {
  const [logs, tasks] = await Promise.all([
    ActivityLog.find({ organization: organizationId, employee: employeeId })
      .sort({ at: -1 })
      .limit(limit)
      .lean(),
    Task.find({ organization: organizationId, assignedTo: employeeId })
      .populate('assignedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ])

  const taskActivities = tasks.map((task) => ({
    type: 'task_assigned',
    at: task.createdAt,
    meta: { taskId: task.taskId, title: task.title },
  }))

  return [...logs, ...taskActivities]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, limit)
}
