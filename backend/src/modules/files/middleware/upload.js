import multer from 'multer'

import { BYTES_PER_MB } from '@hrms/shared'

import { env } from '../../../config/env.js'

const storage = multer.memoryStorage()

/**
 * Single-file multipart upload. The size limit is enforced here so oversized
 * bodies never reach the service; the media type is validated from the bytes
 * afterwards because the multipart header is client-controlled.
 */
export const uploadSingleFile = multer({
  storage,
  limits: {
    fileSize: env.maxUploadMb * BYTES_PER_MB,
    files: 1,
    fields: 5,
  },
}).single('file')
