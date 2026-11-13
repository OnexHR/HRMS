import { Router } from 'express'

import { authenticate } from '../../../middleware/auth.js'
import {
  handleCalendarEvents,
  handleCreateMeeting,
  handleEndMeeting,
  handleGetActiveMeeting,
  handleListColleagues,
  handleMyMeetings,
  handleStartMeeting,
} from '../controllers/meeting.controller.js'

export const meetingRouter = Router()

meetingRouter.get('/meetings', authenticate, handleMyMeetings)
meetingRouter.get('/meetings/active', authenticate, handleGetActiveMeeting)
meetingRouter.post('/meetings', authenticate, handleCreateMeeting)
meetingRouter.post('/meetings/:id/start', authenticate, handleStartMeeting)
meetingRouter.post('/meetings/:id/end', authenticate, handleEndMeeting)
meetingRouter.get('/calendar/events', authenticate, handleCalendarEvents)
meetingRouter.get('/colleagues', authenticate, handleListColleagues)
