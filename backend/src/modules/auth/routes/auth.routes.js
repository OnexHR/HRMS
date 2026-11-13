import { Router } from 'express'

import { authenticate, requireAdmin } from '../../../middleware/auth.js'
import {
  handleAdminLogin,
  handleChangePassword,
  handleLogin,
  handleMe,
} from '../controllers/auth.controller.js'

export const authRouter = Router()

authRouter.post('/auth/admin-login', handleAdminLogin)
authRouter.post('/auth/login', handleLogin)
authRouter.get('/auth/me', authenticate, handleMe)
authRouter.put('/auth/admin/change-password', authenticate, requireAdmin, handleChangePassword)
authRouter.put('/auth/change-password', authenticate, handleChangePassword)
