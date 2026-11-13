import { Router } from 'express'

import { authenticate, requireManager } from '../../../middleware/auth.js'
import {
  handleAssignTask,
  handleGetTask,
  handleGetTaskAttachmentUrl,
  handleMyTasks,
  handleTeamTaskSummary,
  handleTeamTasks,
  handleUpdateTaskStatus,
} from '../controllers/task.controller.js'

export const taskRouter = Router()

taskRouter.get('/tasks', authenticate, handleMyTasks)
taskRouter.post('/tasks', authenticate, requireManager, handleAssignTask)
taskRouter.get('/tasks/team', authenticate, requireManager, handleTeamTasks)
taskRouter.get('/tasks/team/summary', authenticate, requireManager, handleTeamTaskSummary)
taskRouter.get('/tasks/:taskId/attachments/:index/url', authenticate, handleGetTaskAttachmentUrl)
taskRouter.get('/tasks/:id', authenticate, handleGetTask)
taskRouter.patch('/tasks/:id/status', authenticate, handleUpdateTaskStatus)
