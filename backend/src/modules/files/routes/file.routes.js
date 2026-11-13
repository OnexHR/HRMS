import { Router } from 'express'

import { authenticate } from '../../../middleware/auth.js'
import {
  handleDeleteFile,
  handleDownloadFile,
  handleUploadFile,
} from '../controllers/file.controller.js'
import { uploadSingleFile } from '../middleware/upload.js'

export const fileRouter = Router()

fileRouter.post('/files', authenticate, uploadSingleFile, handleUploadFile)
fileRouter.get('/files/:id', authenticate, handleDownloadFile)
fileRouter.delete('/files/:id', authenticate, handleDeleteFile)
