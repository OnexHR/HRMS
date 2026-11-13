import { Router } from 'express'

import { authenticate, requireManager } from '../../../middleware/auth.js'
import {
  handleBreakEnd,
  handleBreakStart,
  handleCheckIn,
  handleCheckOut,
  handleMyAttendanceMonth,
  handleMyAttendanceSummary,
  handleMyAttendanceToday,
  handleTeamAttendanceMonth,
  handleTeamAttendanceRows,
  handleTeamAttendanceStats,
  handleTeamAttendanceToday,
  handleTeamReports,
} from '../controllers/attendance.controller.js'
import {
  handleEmployeeDashboard,
  handleManagerDashboard,
} from '../controllers/dashboard.controller.js'

export const attendanceRouter = Router()

attendanceRouter.post('/attendance/check-in', authenticate, handleCheckIn)
attendanceRouter.post('/attendance/check-out', authenticate, handleCheckOut)
attendanceRouter.post('/attendance/break/start', authenticate, handleBreakStart)
attendanceRouter.post('/attendance/break/end', authenticate, handleBreakEnd)
attendanceRouter.get('/attendance/today', authenticate, handleMyAttendanceToday)
attendanceRouter.get('/attendance/month', authenticate, handleMyAttendanceMonth)
attendanceRouter.get('/attendance/summary', authenticate, handleMyAttendanceSummary)

attendanceRouter.get('/team/attendance', authenticate, requireManager, handleTeamAttendanceToday)
attendanceRouter.get(
  '/team/attendance/stats',
  authenticate,
  requireManager,
  handleTeamAttendanceStats,
)
attendanceRouter.get('/team/attendance/rows', authenticate, requireManager, handleTeamAttendanceRows)
attendanceRouter.get(
  '/team/attendance/month',
  authenticate,
  requireManager,
  handleTeamAttendanceMonth,
)
attendanceRouter.get('/team/reports', authenticate, requireManager, handleTeamReports)

attendanceRouter.get('/dashboard', authenticate, handleEmployeeDashboard)
attendanceRouter.get('/managers-dashboard', authenticate, requireManager, handleManagerDashboard)
