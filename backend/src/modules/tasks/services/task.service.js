import { normalizeTaskStatus } from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { logActivity } from '../../employees/services/activity.service.js'
import { getNextSequence } from '../../employees/models/counter.model.js'
import Employee from '../../employees/models/employee.model.js'
import Task from '../models/task.model.js'
import { normalizeTaskPayload, validateTaskStatus } from '../validators/task.validator.js'

export async function generateTaskId(organizationId) {
  const year = new Date().getFullYear()
  const seq = await getNextSequence(organizationId, `taskId:${year}`)
  return `TSK-${year}-${String(seq).padStart(3, '0')}`
}

/** A manager may only assign to a direct report; an admin to anyone. */
async function assertCanAssign(organizationId, actor, assignee) {
  if (actor.role === 'admin') return
  if (actor.role !== 'manager') {
    throw ApiError.forbidden('Only managers and administrators can assign tasks.')
  }
  if (String(assignee.manager) !== actor.employeeId) {
    throw ApiError.forbidden('You can only assign tasks to your team members.')
  }
  if (!assignee.organization || String(assignee.organization) !== organizationId) {
    throw ApiError.notFound('Assigned employee does not exist.')
  }
}

export async function assignTask({ organizationId, actor, body }) {
  const payload = normalizeTaskPayload(body)

  const assignee = await Employee.findOne({
    _id: payload.assignedTo,
    organization: organizationId,
    'job.isActive': true,
  }).lean()
  if (!assignee) throw ApiError.validation('Assigned employee does not exist.')

  await assertCanAssign(organizationId, actor, assignee)

  const task = await Task.create({
    ...payload,
    organization: organizationId,
    taskId: await generateTaskId(organizationId),
    assignedTo: assignee._id,
    assignedBy: actor.employeeId,
  })

  await logActivity(organizationId, assignee._id, 'task_assigned', {
    taskId: task.taskId,
    title: task.title,
    by: actor.employeeId,
  })

  return task
}

const idOf = (value) => {
  if (!value) return null
  const id = typeof value === 'object' ? value._id : value
  return id ? String(id) : null
}

const TASK_POPULATE = [
  { path: 'assignedTo', select: 'firstName lastName employeeCode department' },
  { path: 'assignedBy', select: 'firstName lastName employeeCode' },
]

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function normalizeStatusFilter(value) {
  if (!value) return null
  return normalizeTaskStatus(value)
}

/** Transport shape: GridFS ids become authenticated resource paths. */
export function serializeAttachment(attachment) {
  if (attachment === null || attachment === undefined) return null
  if (typeof attachment === 'object') return attachment

  const value = String(attachment)
  if (/^https?:\/\//i.test(value)) {
    const name = value.split('?')[0].split('/').pop() || 'Attachment'
    return { name, fileId: null, url: value }
  }

  return { name: 'Attachment', fileId: value, url: `/api/v1/files/${value}` }
}

export function serializeTask(task) {
  if (!task) return task
  const plain = typeof task.toObject === 'function' ? task.toObject() : { ...task }
  plain.attachments = (plain.attachments || []).map(serializeAttachment)
  return plain
}

export async function listMyTasks(organizationId, employeeId, query = {}) {
  const filter = { organization: organizationId, assignedTo: employeeId }
  const status = normalizeStatusFilter(query.status)
  if (status) filter.status = status
  if (query.priority) filter.priority = query.priority
  if (query.search) {
    filter.title = new RegExp(escapeRegex(query.search), 'i')
  }

  const tasks = await Task.find(filter)
    .populate(TASK_POPULATE)
    .sort({ dueDate: 1 })
    .lean()

  return {
    tasks: tasks.map(serializeTask),
    summary: await getTaskSummaryFor(organizationId, employeeId),
  }
}

export async function listTeamTasks(organizationId, principal, query = {}) {
  const filter = { organization: organizationId }
  const status = normalizeStatusFilter(query.status)
  if (status) filter.status = status
  if (query.priority) filter.priority = query.priority

  if (principal.role !== 'admin') {
    const team = await Employee.find({
      organization: organizationId,
      manager: principal.employeeId,
      'job.isActive': true,
    })
      .select('_id')
      .lean()
    filter.assignedTo = { $in: team.map((member) => member._id) }
  }
  if (query.assignee) filter.assignedTo = query.assignee

  const tasks = await Task.find(filter)
    .populate(TASK_POPULATE)
    .sort({ dueDate: 1 })
    .lean()

  return { tasks: tasks.map(serializeTask) }
}

export async function getTaskFor(organizationId, actor, taskId) {
  const task = await Task.findOne({ _id: taskId, organization: organizationId }).populate(
    TASK_POPULATE,
  )
  if (!task) throw ApiError.notFound('Task not found.')
  if (!(await canManageTask(organizationId, actor, task))) {
    throw ApiError.forbidden('Access denied.')
  }
  return serializeTask(task)
}

export async function taskAttachmentFor(organizationId, actor, taskId, index) {
  const task = await Task.findOne({ _id: taskId, organization: organizationId })
  if (!task) throw ApiError.notFound('Task not found.')
  if (!(await canManageTask(organizationId, actor, task))) {
    throw ApiError.forbidden('Access denied.')
  }

  const attachment = task.attachments?.[index]
  if (!attachment) throw ApiError.notFound('Attachment not found.')
  const serialized = serializeAttachment(attachment)

  return {
    url: serialized?.url ?? null,
    fileId: serialized?.fileId ?? null,
    name: serialized?.name ?? 'Attachment',
  }
}

export async function canManageTask(organizationId, actor, task) {
  if (actor.role === 'admin') return true

  const actorId = actor.employeeId ?? idOf(actor)
  const assigneeId = idOf(task.assignedTo)
  const assignerId = idOf(task.assignedBy)

  if (actor.role === 'manager') {
    if (assignerId === actorId) return true
    if (!assigneeId) return false

    // Manager authority is derived from the current reporting line rather than
    // from a denormalized value on the task.
    const assignee = await Employee.findOne({
      _id: assigneeId,
      organization: organizationId,
    })
      .select('manager')
      .lean()
    return String(assignee?.manager ?? '') === actorId
  }

  return assigneeId === actorId
}

export async function updateTaskStatus({ organizationId, actor, taskId, body }) {
  const task = await Task.findOne({ _id: taskId, organization: organizationId })
  if (!task) throw ApiError.notFound('Task not found.')
  if (!(await canManageTask(organizationId, actor, task))) {
    throw ApiError.forbidden('You do not have permission to update this task.')
  }

  const { status } = validateTaskStatus(body)
  task.status = status
  if (status === 'Completed') {
    task.completedAt = new Date()
    await logActivity(organizationId, task.assignedTo, 'task_completed', {
      taskId: task.taskId,
      title: task.title,
    })
  } else {
    task.completedAt = null
  }

  await task.save()
  return task
}

export async function getTaskSummaryFor(organizationId, employeeId) {
  const tasks = await Task.find({ organization: organizationId, assignedTo: employeeId }).lean()
  const now = new Date()
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === 'Completed').length,
    inProgress: tasks.filter((task) => task.status === 'In Progress').length,
    onHold: tasks.filter((task) => task.status === 'On Hold').length,
    pending: tasks.filter((task) => task.status === 'Pending').length,
    overdue: tasks.filter(
      (task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'Completed',
    ).length,
  }
}

export async function teamTaskSummary(organizationId, principal) {
  let filter = { organization: organizationId }
  if (principal.role !== 'admin') {
    const team = await Employee.find({
      organization: organizationId,
      manager: principal.employeeId,
      'job.isActive': true,
    })
      .select('_id')
      .lean()
    filter.assignedTo = { $in: team.map((member) => member._id) }
  }

  const tasks = await Task.find(filter).lean()
  const now = new Date()
  return {
    total: tasks.length,
    completed: tasks.filter((task) => task.status === 'Completed').length,
    inProgress: tasks.filter((task) => task.status === 'In Progress').length,
    onHold: tasks.filter((task) => task.status === 'On Hold').length,
    pending: tasks.filter((task) => task.status === 'Pending').length,
    overdue: tasks.filter(
      (task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'Completed',
    ).length,
  }
}
