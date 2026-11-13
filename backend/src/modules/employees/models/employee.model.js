import mongoose from 'mongoose'

import { EMPLOYEE_CODE_PAD, EMPLOYEE_CODE_PREFIX, ROLES } from '@hrms/shared'

import { hashPassword, comparePassword } from '../../../lib/password.js'
import { getNextSequence } from './counter.model.js'

const LeaveBucketSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0, min: 0 },
    used: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
)

const employeeSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: { type: String, enum: ROLES, default: 'employee' },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    employeeCode: { type: String, trim: true },
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
      index: true,
    },
    job: {
      joinDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      status: {
        type: String,
        enum: ['active', 'on_leave', 'terminated', 'inactive'],
        default: 'active',
      },
      isActive: { type: Boolean, default: true },
    },
    personal: {
      dateOfBirth: { type: Date, default: null },
      gender: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      emergencyContact: { type: String, trim: true, default: '' },
    },
    profile: {
      bio: { type: String, trim: true, default: '' },
      // Authenticated GridFS file id. No public URL is stored.
      avatarFileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FileAsset',
        default: null,
      },
      // Retained for legacy donor rows; new uploads use avatarFileId.
      imageUrl: { type: String, trim: true, default: '' },
      dob: { type: Date, default: null },
      address: { type: String, trim: true, maxlength: 300, default: '' },
      skills: [{ type: String, trim: true }],
    },
    leaveBalances: {
      casual: { type: LeaveBucketSchema, default: () => ({ total: 12, used: 0 }) },
      sick: { type: LeaveBucketSchema, default: () => ({ total: 10, used: 0 }) },
      earned: { type: LeaveBucketSchema, default: () => ({ total: 15, used: 0 }) },
      unpaid: { type: LeaveBucketSchema, default: () => ({ total: 0, used: 0 }) },
    },
  },
  { timestamps: true },
)

employeeSchema.index({ organization: 1, email: 1 }, { unique: true })
employeeSchema.index({ organization: 1, employeeCode: 1 }, { unique: true, sparse: true })
employeeSchema.index({ organization: 1, role: 1, 'job.isActive': 1 })
employeeSchema.index({ organization: 1, manager: 1 })

employeeSchema.pre('save', async function onSave() {
  if (this.isModified('password')) {
    this.password = await hashPassword(this.password)
  }

  if (!this.employeeCode && this.organization) {
    const seq = await getNextSequence(this.organization, 'employeeCode')
    this.employeeCode = `${EMPLOYEE_CODE_PREFIX}${String(seq).padStart(EMPLOYEE_CODE_PAD, '0')}`
  }
})

employeeSchema.methods.comparePassword = function compare(candidate) {
  return comparePassword(candidate, this.password)
}

/** Safe transport shape: never includes the password hash. */
export function sanitizeEmployee(employee) {
  if (!employee) return null
  const doc = employee.toObject ? employee.toObject() : { ...employee }
  delete doc.password
  return doc
}

const Employee = mongoose.model('Employee', employeeSchema)
export default Employee
