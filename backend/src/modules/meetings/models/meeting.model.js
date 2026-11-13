import mongoose from 'mongoose'

import { MEETING_STATUSES } from '@hrms/shared'

const meetingSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    meetingLink: { type: String, trim: true, default: null },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    durationMin: { type: Number, default: 0 },
    status: { type: String, enum: MEETING_STATUSES, default: 'scheduled' },
    actualStartedAt: { type: Date, default: null },
    actualEndedAt: { type: Date, default: null },
    expectedDuration: { type: Number, default: 0 },
    expectedEndAt: { type: Date, default: null },
    actualDuration: { type: Number, default: 0 },
  },
  { timestamps: true },
)

meetingSchema.index({ organization: 1, participants: 1, startTime: 1 })
meetingSchema.index({ organization: 1, status: 1, participants: 1 })

const Meeting = mongoose.model('EmployeeMeeting', meetingSchema)
export default Meeting
