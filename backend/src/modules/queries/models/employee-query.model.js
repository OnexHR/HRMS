import mongoose from 'mongoose'

import { QUERY_STATUSES } from '@hrms/shared'

const employeeQuerySchema = new mongoose.Schema(
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
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployeeTask',
      default: null,
    },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    status: { type: String, enum: QUERY_STATUSES, default: 'open' },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    review: { type: String, trim: true, default: '' },
    reviewedAt: { type: Date, default: null },
    attachments: [{ type: String, trim: true }],
  },
  { timestamps: true },
)

employeeQuerySchema.index({ organization: 1, status: 1, createdAt: -1 })
employeeQuerySchema.index({ organization: 1, employee: 1, createdAt: -1 })

const EmployeeQuery = mongoose.model('EmployeeQuery', employeeQuerySchema)
export default EmployeeQuery
