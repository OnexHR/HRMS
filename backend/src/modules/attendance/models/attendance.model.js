import mongoose from 'mongoose'

import { ATTENDANCE_STATUSES } from '@hrms/shared'

const attendanceSchema = new mongoose.Schema(
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
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: 'present',
    },
    checkIn: { type: Date, default: null },
    checkOut: { type: Date, default: null },
    // All check-in/check-out sessions for the day. A day may hold several
    // sessions (check out, then check back in); working minutes are the sum of
    // each session's duration minus breaks. checkIn/checkOut are derived
    // (first check-in / last check-out) for backward compatibility.
    sessions: {
      type: [
        {
          checkIn: { type: Date, required: true },
          checkOut: { type: Date, default: null },
        },
      ],
      default: [],
    },
    breakStart: { type: Date, default: null },
    breakEnd: { type: Date, default: null },
    breaks: {
      type: [
        {
          start: { type: Date, required: true },
          end: { type: Date, required: true },
        },
      ],
      default: [],
    },
    breakMinutes: { type: Number, default: 0 },
    workingMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

attendanceSchema.index({ organization: 1, employee: 1, date: 1 }, { unique: true })
attendanceSchema.index({ organization: 1, date: 1 })

const Attendance = mongoose.model('EmployeeAttendance', attendanceSchema)
export default Attendance
