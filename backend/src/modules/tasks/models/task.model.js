import mongoose from 'mongoose'

import { TASK_PRIORITIES, TASK_STATUSES } from '@hrms/shared'

const taskSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    taskId: { type: String },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'Medium' },
    status: { type: String, enum: TASK_STATUSES, default: 'Not Started' },
    completedAt: { type: Date, default: null },
    // Authenticated GridFS file ids. Legacy rows may still hold a URL/key.
    attachments: [{ type: String, trim: true }],
  },
  { timestamps: true },
)

taskSchema.index({ organization: 1, taskId: 1 }, { unique: true, sparse: true })
taskSchema.index({ organization: 1, assignedTo: 1, status: 1 })
taskSchema.index({ organization: 1, assignedBy: 1 })

const Task = mongoose.model('EmployeeTask', taskSchema)
export default Task
