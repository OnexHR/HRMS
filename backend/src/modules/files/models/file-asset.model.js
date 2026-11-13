import mongoose from 'mongoose'

import { FILE_SCOPES } from '@hrms/shared'

/**
 * Metadata for a GridFS object. The binary lives in the `uploads` bucket; this
 * record adds tenant, ownership and display metadata without exposing a storage
 * key to clients.
 */
const fileAssetSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    scope: { type: String, enum: FILE_SCOPES, default: 'general' },
    originalName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
    gridFsId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true },
)

fileAssetSchema.index({ organization: 1, uploadedBy: 1, createdAt: -1 })

const FileAsset = mongoose.model('FileAsset', fileAssetSchema)
export default FileAsset
