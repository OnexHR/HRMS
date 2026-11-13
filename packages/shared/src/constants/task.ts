/**
 * Task vocabulary. Status strings are kept in their source casing because they
 * are already persisted in that form and shown directly in the UI.
 */

export const TASK_STATUSES = [
  'Not Started',
  'In Progress',
  'On Hold',
  'Pending',
  'Completed',
] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['High', 'Medium', 'Low'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const DEFAULT_TASK_STATUS: TaskStatus = 'Not Started'
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'Medium'

/** Tolerates casing drift from older clients (`In progress`, `on hold`). */
export const TASK_STATUS_ALIASES: Record<string, TaskStatus> = {
  'Not started': 'Not Started',
  'In progress': 'In Progress',
  'On hold': 'On Hold',
  pending: 'Pending',
  completed: 'Completed',
  'not started': 'Not Started',
  'in progress': 'In Progress',
  'on hold': 'On Hold',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  'Not Started': 'Not Started',
  'In Progress': 'In Progress',
  'On Hold': 'On Hold',
  Pending: 'Pending',
  Completed: 'Completed',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
}

/** Normalizes any incoming status value to a known status. */
export function normalizeTaskStatus(value: unknown): TaskStatus {
  if (typeof value !== 'string') return DEFAULT_TASK_STATUS
  const trimmed = value.trim()
  const alias = TASK_STATUS_ALIASES[trimmed]
  if (alias) return alias
  return (TASK_STATUSES as readonly string[]).includes(trimmed)
    ? (trimmed as TaskStatus)
    : DEFAULT_TASK_STATUS
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value)
}

export function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && (TASK_PRIORITIES as readonly string[]).includes(value)
}

/** Terminal status used for completion timestamps. */
export const COMPLETED_TASK_STATUS: TaskStatus = 'Completed'

export const TASK_CODE_PREFIX = 'TSK'
export const MAX_TASK_TITLE_LENGTH = 200
export const MAX_TASK_DESCRIPTION_LENGTH = 2000
export const MAX_TASK_ATTACHMENTS = 10
