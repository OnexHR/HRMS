import { sendCreated, sendData } from '../../../lib/response.js'
import {
  assignTask,
  getTaskFor,
  listMyTasks,
  listTeamTasks,
  serializeTask,
  taskAttachmentFor,
  teamTaskSummary,
  updateTaskStatus,
} from '../services/task.service.js'

export async function handleAssignTask(req, res) {
  const task = await assignTask({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    body: req.body ?? {},
  })
  return sendCreated(res, { task: serializeTask(task) })
}

/** Donor `/admin/tasks` compatibility route. */
export const handleAdminAssignTask = handleAssignTask

export async function handleMyTasks(req, res) {
  const result = await listMyTasks(
    req.principal.organizationId,
    req.principal.employeeId,
    req.query,
  )
  return sendData(res, result)
}

export async function handleTeamTasks(req, res) {
  return sendData(
    res,
    await listTeamTasks(req.principal.organizationId, req.principal, req.query),
  )
}

export async function handleTeamTaskSummary(req, res) {
  return sendData(
    res,
    await teamTaskSummary(req.principal.organizationId, req.principal),
  )
}

export async function handleGetTask(req, res) {
  const task = await getTaskFor(
    req.principal.organizationId,
    req.principal,
    req.params.id,
  )
  return sendData(res, { task })
}

export async function handleGetTaskAttachmentUrl(req, res) {
  const attachment = await taskAttachmentFor(
    req.principal.organizationId,
    req.principal,
    req.params.taskId,
    Number(req.params.index),
  )
  return sendData(res, attachment)
}

export async function handleUpdateTaskStatus(req, res) {
  const task = await updateTaskStatus({
    organizationId: req.principal.organizationId,
    actor: req.principal,
    taskId: req.params.id,
    body: req.body ?? {},
  })
  return sendData(res, { task: serializeTask(task) })
}
