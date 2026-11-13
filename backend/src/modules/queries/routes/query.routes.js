import { Router } from 'express'

import { authenticate, requireManager } from '../../../middleware/auth.js'
import {
  handleMyQueries,
  handleQueryStats,
  handleRaiseQuery,
  handleReviewQuery,
  handleTeamQueries,
} from '../controllers/query.controller.js'

export const queryRouter = Router()

queryRouter.get('/queries/team', authenticate, requireManager, handleTeamQueries)
queryRouter.post('/queries/:id/review', authenticate, requireManager, handleReviewQuery)
queryRouter.post('/queries', authenticate, handleRaiseQuery)
queryRouter.get('/queries', authenticate, handleMyQueries)
queryRouter.get('/queries/stats', authenticate, handleQueryStats)
