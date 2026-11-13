import { Router } from 'express'

import { authenticate, requireManager } from '../../../middleware/auth.js'
import {
  handleBalance,
  handleCancelLeave,
  handleHistory,
  handlePendingForManager,
  handleReviewLeave,
  handleSaveDraft,
  handleSubmitLeave,
  handleUpdateDraft,
} from '../controllers/leave.controller.js'

export const leaveRouter = Router()

leaveRouter.get('/leave/balance', authenticate, handleBalance)
leaveRouter.post('/leave', authenticate, handleSubmitLeave)
leaveRouter.post('/leave/draft', authenticate, handleSaveDraft)
leaveRouter.put('/leave/:id/draft', authenticate, handleUpdateDraft)
leaveRouter.post('/leave/:id/cancel', authenticate, handleCancelLeave)
leaveRouter.get('/leave/history', authenticate, handleHistory)

leaveRouter.get('/team/leave/pending', authenticate, requireManager, handlePendingForManager)
leaveRouter.patch('/team/leave/:id/status', authenticate, requireManager, handleReviewLeave)
