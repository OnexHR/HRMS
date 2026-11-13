import {
  MAX_TASK_ATTACHMENTS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  normalizeTaskStatus,
} from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { parseDate } from '../../../lib/dates.js'

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/

export function normalizeTaskPayload(body = {}) {
  const errors = []
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const assignedTo = body.assignedTo ?? body.assignee

  if (!title) errors.push('title is required.')
  if (title.length > 200) errors.push('title must be 200 characters or fewer.')
  if (!assignedTo || !OBJECT_ID_RE.test(String(assignedTo))) {
    errors.push('assignedTo is required and must be a valid employee id.')
  }

  const description = typeof body.description === 'string' ? body.description.trim() : ''
  if (description.length > 2000) errors.push('description must be 2000 characters or fewer.')

  const dueDate = body.dueDate ? parseDate(body.dueDate) : null
  if (body.dueDate && !dueDate) errors.push('dueDate must be a valid date.')

  const priority = TASK_PRIORITIES.includes(body.priority) ? body.priority : 'Medium'
  const status = normalizeTaskStatus(body.status)
  if (body.status !== undefined && !TASK_STATUSES.includes(body.status)) {
    // normalizeTaskStatus is deliberately tolerant; only reject values that
    // cannot be mapped at all and are not one of the legacy statuses.
    const normalized = normalizeTaskStatus(body.status)
    if (!normalized) errors.push('status is invalid.')
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments.map((value) => String(value)).filter(Boolean)
    : []
  if (attachments.length > MAX_TASK_ATTACHMENTS) {
    errors.push(`At most ${MAX_TASK_ATTACHMENTS} attachments are allowed.`)
  }

  if (errors.length) throw ApiError.validation('Invalid task payload.', { issues: errors })

  return {
    title,
    description,
    assignedTo: String(assignedTo),
    dueDate,
    priority,
    status,
    attachments,
  }
}

export function validateTaskStatus(body = {}) {
  const status = normalizeTaskStatus(body.status)
  if (!TASK_STATUSES.includes(status)) throw ApiError.validation('Invalid task status.')
  return { status }
}
