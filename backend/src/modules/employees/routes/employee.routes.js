import { Router } from 'express'

import { authenticate, requireAdmin, requireManager } from '../../../middleware/auth.js'
import { handleAdminAssignTask } from '../../tasks/controllers/task.controller.js'
import {
  handleAddTeamMember,
  handleAdminStats,
  handleCreateEmployee,
  handleDeleteEmployee,
  handleGetEmployee,
  handleGetMe,
  handleListAvailableEmployees,
  handleListEmployees,
  handleListManagers,
  handleRemoveTeamMember,
  handleTeamCreateEmployee,
  handleTeamMemberDetail,
  handleTeamMembers,
  handleUpdateEmployee,
  handleUpdateEmployeeStatus,
  handleUpdateMe,
} from '../controllers/employee.controller.js'

export const employeeRouter = Router()

// Admin surface. Every route is organization-scoped by the service layer.
employeeRouter.get('/admin/stats', authenticate, requireAdmin, handleAdminStats)
employeeRouter.get('/admin/managers', authenticate, requireAdmin, handleListManagers)
employeeRouter.post('/admin/employees', authenticate, requireAdmin, handleCreateEmployee)
employeeRouter.get('/admin/employees', authenticate, requireAdmin, handleListEmployees)
employeeRouter.get('/admin/employees/:id', authenticate, requireAdmin, handleGetEmployee)
employeeRouter.put('/admin/employees/:id', authenticate, requireAdmin, handleUpdateEmployee)
employeeRouter.delete('/admin/employees/:id', authenticate, requireAdmin, handleDeleteEmployee)
employeeRouter.patch(
  '/admin/employees/:id/status',
  authenticate,
  requireAdmin,
  handleUpdateEmployeeStatus,
)

employeeRouter.post('/admin/tasks', authenticate, requireAdmin, handleAdminAssignTask)

// Own profile.
employeeRouter.get('/me', authenticate, handleGetMe)
employeeRouter.put('/me', authenticate, handleUpdateMe)

// Team management (manager reporting scope, organization-wide for admins).
employeeRouter.get('/team', authenticate, requireManager, handleTeamMembers)
employeeRouter.post('/team', authenticate, requireManager, handleTeamCreateEmployee)
employeeRouter.get('/team/available', authenticate, requireManager, handleListAvailableEmployees)
employeeRouter.post('/team/assign', authenticate, requireManager, handleAddTeamMember)
employeeRouter.delete('/team/assign/:id', authenticate, requireManager, handleRemoveTeamMember)
employeeRouter.get('/team/member/:id', authenticate, requireManager, handleTeamMemberDetail)
