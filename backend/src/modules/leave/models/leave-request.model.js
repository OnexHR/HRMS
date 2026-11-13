import mongoose from 'mongoose'

import { LEAVE_DAY_TYPES, LEAVE_STATUSES, LEAVE_TYPES } from '@hrms/shared'

const leaveRequestSchema = new mongoose.Schema(
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
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    leaveType: { type: String, enum: LEAVE_TYPES, required: true },
    dayType: { type: String, enum: LEAVE_DAY_TYPES, default: 'full_day' },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, trim: true, default: '' },
    contactWhileOnLeave: { type: String, trim: true, default: '' },
    attachments: [{ type: String, trim: true }],
    status: { type: String, enum: LEAVE_STATUSES, default: 'draft' },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    reviewNote: { type: String, trim: true, default: '' },
    reviewedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
  },
  { timestamps: true },
)

leaveRequestSchema.index({ organization: 1, employee: 1, status: 1, fromDate: -1 })
leaveRequestSchema.index({ organization: 1, manager: 1, status: 1 })
leaveRequestSchema.index({ organization: 1, status: 1, fromDate: 1 })

const LeaveRequest = mongoose.model('EmployeeLeaveRequest', leaveRequestSchema)
export default LeaveRequest
