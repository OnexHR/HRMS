import type { TaskPriority, TaskStatus } from '../constants/task.js'
import type { EntityId, ISODateString, Nullable } from './api.js'
import type { EmployeeSummary } from './employee.js'
import type { FileResource } from './file.js'

export interface Task {
  id: EntityId
  organizationId: EntityId
  /** Human-facing code, unique per organization (`TSK-2026-001`). */
  taskId: string
  title: string
  description: string
  assignedTo: EntityId
  assignee?: EmployeeSummary
  assignedBy: EntityId
  assigner?: EmployeeSummary
  dueDate: Nullable<ISODateString>
  priority: TaskPriority
  status: TaskStatus
  completedAt: Nullable<ISODateString>
  attachments: FileResource[]
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface TaskSummary {
  total: number
  notStarted: number
  inProgress: number
  onHold: number
  pending: number
  completed: number
  overdue: number
}

export interface TeamTaskSummary extends TaskSummary {
  byEmployee: Array<{ employee: EmployeeSummary; summary: TaskSummary }>
}

export interface TaskListQuery {
  page?: number
  pageSize?: number
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: EntityId
}
