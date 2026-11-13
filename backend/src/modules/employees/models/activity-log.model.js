import mongoose from 'mongoose'

import { ACTIVITY_TYPES } from '@hrms/shared'

const activityLogSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    at: { type: Date, default: Date.now },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

activityLogSchema.index({ organization: 1, employee: 1, at: -1 })

const ActivityLog = mongoose.model('EmployeeActivityLog', activityLogSchema)
export default ActivityLog
