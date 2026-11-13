import { Router } from 'express'

import { authRouter } from '../modules/auth/routes/auth.routes.js'
import { employeeRouter } from '../modules/employees/routes/employee.routes.js'
import { attendanceRouter } from '../modules/attendance/routes/attendance.routes.js'
import { leaveRouter } from '../modules/leave/routes/leave.routes.js'
import { taskRouter } from '../modules/tasks/routes/task.routes.js'
import { queryRouter } from '../modules/queries/routes/query.routes.js'
import { meetingRouter } from '../modules/meetings/routes/meeting.routes.js'
import { fileRouter } from '../modules/files/routes/file.routes.js'

/**
 * The complete `/api/v1` surface.
 *
 * Every donor HRMS route keeps its path suffix; the three authenticated GridFS
 * routes are additive.
 */
export const apiRouter = Router()

apiRouter.use(fileRouter)
apiRouter.use(authRouter)
apiRouter.use(employeeRouter)
apiRouter.use(attendanceRouter)
apiRouter.use(leaveRouter)
apiRouter.use(taskRouter)
apiRouter.use(queryRouter)
apiRouter.use(meetingRouter)
