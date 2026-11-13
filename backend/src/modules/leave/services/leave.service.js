import mongoose from 'mongoose'

import { PAID_LEAVE_TYPES } from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { logActivity } from '../../employees/services/activity.service.js'
import Employee from '../../employees/models/employee.model.js'
import LeaveRequest from '../models/leave-request.model.js'
import { validateLeaveRequest, validateLeaveStatus } from '../validators/leave.validator.js'

/**
 * Runs a unit of work in a transaction when the deployment supports one, and
 * falls back to guarded sequential writes on a standalone MongoDB server.
 * Callers must keep every write conditional so the fallback cannot double-apply.
 */
export async function runAtomically(work) {
  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => {
      result = await work(session)
    })
    return result
  } catch (error) {
    const unsupported =
      error?.code === 20 ||
      /Transaction numbers are only allowed|replica set|mongos/i.test(String(error?.message))
    if (!unsupported) throw error
  } finally {
    await session.endSession()
  }

  return work(null)
}

export function balanceView(employee) {
  const balances = employee.leaveBalances || {}
  const map = (key, label) => {
    const bucket = balances[key] || { total: 0, used: 0 }
    return {
      label,
      total: bucket.total ?? 0,
      used: bucket.used ?? 0,
      remaining: Math.max(0, (bucket.total ?? 0) - (bucket.used ?? 0)),
    }
  }

  return {
    casual: map('casual', 'Casual Leave'),
    sick: map('sick', 'Sick Leave'),
    earned: map('earned', 'Earned Leave'),
    unpaid: map('unpaid', 'Unpaid Leave'),
  }
}

function isPaid(leaveType) {
  return PAID_LEAVE_TYPES.includes(leaveType)
}

export async function pendingDaysFor(organizationId, employeeId, session = null) {
  let query = LeaveRequest.find({
    organization: organizationId,
    employee: employeeId,
    status: 'pending',
  })
  if (session) query = query.session(session)

  const requests = await query.lean()
  const totals = {}
  for (const request of requests) {
    totals[request.leaveType] = (totals[request.leaveType] || 0) + request.days
  }
  return totals
}

export async function createLeaveRequest({ organizationId, employee, body, saveAsDraft }) {
  const payload = validateLeaveRequest(body)

  if (!saveAsDraft && isPaid(payload.leaveType)) {
    const pending = await pendingDaysFor(organizationId, employee._id)
    const bucket = employee.leaveBalances?.[payload.leaveType] || { total: 0, used: 0 }
    const available = Math.max(0, bucket.total - bucket.used) - (pending[payload.leaveType] || 0)
    if (payload.days > available) {
      throw ApiError.validation(
        `Insufficient ${payload.leaveType} leave balance (${payload.days} requested, ${available} available).`,
      )
    }
  }

  const doc = await LeaveRequest.create({
    ...payload,
    organization: organizationId,
    employee: employee._id,
    manager: employee.manager || null,
    status: saveAsDraft ? 'draft' : 'pending',
  })

  if (!saveAsDraft) {
    await logActivity(organizationId, employee._id, 'leave_submitted', {
      leaveId: doc._id,
      days: doc.days,
    })
  }

  return doc
}

export async function updateDraft({ organizationId, employeeId, requestId, body }) {
  const doc = await LeaveRequest.findOne({
    _id: requestId,
    organization: organizationId,
    employee: employeeId,
    status: 'draft',
  })
  if (!doc) throw ApiError.notFound('Draft leave request not found.')

  Object.assign(doc, validateLeaveRequest(body))
  await doc.save()
  return doc
}

async function restoreBalance({ session, employeeId, leaveType, days }) {
  if (!isPaid(leaveType) || days <= 0) return

  const path = `leaveBalances.${leaveType}.used`
  const filter = { _id: employeeId, [path]: { $gte: days } }
  const update = { $inc: { [path]: -days } }

  if (session) {
    const employee = await Employee.findOne(filter).session(session)
    if (!employee) throw ApiError.conflict('Leave balance is inconsistent; contact an administrator.')
    const bucket = employee.leaveBalances[leaveType]
    bucket.used = Math.max(0, (bucket.used || 0) - days)
    await employee.save({ session })
    return
  }

  const updated = await Employee.updateOne(filter, update)
  if (updated.modifiedCount !== 1) {
    throw ApiError.conflict('Leave balance is inconsistent; contact an administrator.')
  }
}

export async function cancelRequest({ organizationId, employeeId, requestId }) {
  const doc = await LeaveRequest.findOne({
    _id: requestId,
    organization: organizationId,
    employee: employeeId,
  })
  if (!doc) throw ApiError.notFound('Leave request not found.')

  if (doc.status === 'cancelled') return doc
  if (!['draft', 'pending', 'approved'].includes(doc.status)) {
    throw ApiError.validation('This leave request cannot be cancelled.')
  }

  if (doc.status === 'approved' && doc.fromDate.getTime() <= Date.now()) {
    throw ApiError.validation('Approved leave can only be cancelled before its start date.')
  }

  const cancelled = await runAtomically(async (session) => {
    const filter = {
      _id: doc._id,
      organization: organizationId,
      status: doc.status,
    }
    const update = {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: employeeId,
      },
    }

    const result = session
      ? await LeaveRequest.findOneAndUpdate(filter, update, { new: true, session })
      : await LeaveRequest.findOneAndUpdate(filter, update, { new: true })

    if (!result) throw ApiError.conflict('The leave request changed state. Reload and try again.')

    if (doc.status === 'approved') {
      try {
        await restoreBalance({
          session,
          employeeId: doc.employee,
          leaveType: doc.leaveType,
          days: doc.days,
        })
      } catch (error) {
        if (!session) {
          // The fallback cannot roll back automatically; restore the previous
          // state explicitly so a failed balance update never burns leave.
          await LeaveRequest.updateOne(
            { _id: doc._id, status: 'cancelled' },
            { $set: { status: 'approved', cancelledAt: null, cancelledBy: null } },
          )
        }
        throw error
      }
    }

    return result
  })

  await logActivity(organizationId, employeeId, 'leave_cancelled', { leaveId: doc._id })
  return cancelled
}

export async function reviewRequest({ organizationId, reviewer, requestId, body }) {
  const { status, note } = validateLeaveStatus(body)

  const doc = await LeaveRequest.findOne({
    _id: requestId,
    organization: organizationId,
  })
  if (!doc) throw ApiError.notFound('Leave request not found.')
  if (doc.status !== 'pending') {
    throw ApiError.validation('Only pending leave requests can be reviewed.')
  }

  const employee = await Employee.findOne({
    _id: doc.employee,
    organization: organizationId,
  })
  if (!employee) throw ApiError.notFound('Employee not found.')

  const isOwnerManager = employee.manager && String(employee.manager) === reviewer.employeeId
  if (reviewer.role !== 'admin' && !isOwnerManager) {
    throw ApiError.forbidden('This leave request does not belong to your team.')
  }

  if (status === 'approved' && isPaid(doc.leaveType)) {
    const bucket = employee.leaveBalances?.[doc.leaveType] || { total: 0, used: 0 }
    const remaining = Math.max(0, bucket.total - bucket.used)
    if (doc.days > remaining) {
      throw ApiError.validation(
        `Cannot approve: insufficient ${doc.leaveType} balance (${doc.days} requested, ${remaining} available).`,
      )
    }
  }

  const reviewed = await runAtomically(async (session) => {
    const filter = { _id: doc._id, organization: organizationId, status: 'pending' }
    const update = {
      $set: {
        status,
        reviewedBy: reviewer.employeeId,
        reviewNote: note || '',
        reviewedAt: new Date(),
      },
    }

    const result = session
      ? await LeaveRequest.findOneAndUpdate(filter, update, { new: true, session })
      : await LeaveRequest.findOneAndUpdate(filter, update, { new: true })

    if (!result) throw ApiError.conflict('The leave request was already reviewed.')

    if (status === 'approved' && isPaid(doc.leaveType)) {
      const path = `leaveBalances.${doc.leaveType}.used`
      if (session) {
        const locked = await Employee.findOne({ _id: employee._id }).session(session)
        const bucket = locked.leaveBalances[doc.leaveType]
        const remaining = Math.max(0, (bucket.total || 0) - (bucket.used || 0))
        if (doc.days > remaining) {
          throw ApiError.validation(
            `Cannot approve: insufficient ${doc.leaveType} balance (${doc.days} requested, ${remaining} available).`,
          )
        }
        bucket.used = (bucket.used || 0) + doc.days
        await locked.save({ session })
      } else {
        const total = employee.leaveBalances?.[doc.leaveType]?.total ?? 0
        const updated = await Employee.updateOne(
          { _id: employee._id, [path]: { $lte: total - doc.days } },
          { $inc: { [path]: doc.days } },
        )
        if (updated.modifiedCount !== 1) {
          // Compensate in the non-transactional fallback: the request must not
          // stay approved when the balance could not be consumed.
          await LeaveRequest.updateOne(
            { _id: doc._id, status },
            {
              $set: {
                status: 'pending',
                reviewedBy: null,
                reviewNote: '',
                reviewedAt: null,
              },
            },
          )
          throw ApiError.validation(
            `Cannot approve: insufficient ${doc.leaveType} balance.`,
          )
        }
      }
    }

    return result
  })

  await logActivity(
    organizationId,
    doc.employee,
    status === 'approved' ? 'leave_approved' : 'leave_rejected',
    { leaveId: doc._id, reviewedBy: reviewer.employeeId },
  )

  return reviewed
}

export async function pendingForManager({ organizationId, principal }) {
  const filter = { organization: organizationId, status: 'pending' }
  if (principal.role !== 'admin') filter.manager = principal.employeeId

  return LeaveRequest.find(filter)
    .sort({ fromDate: 1 })
    .populate('employee', 'firstName lastName employeeCode department')
}

function serializeLeaveAttachments(attachments = []) {
  return attachments.map((attachment) => {
    const value = String(attachment)
    if (/^https?:\/\//i.test(value)) {
      const name = value.split('?')[0].split('/').pop() || 'Attachment'
      return { name, fileId: null, url: value }
    }
    return { name: 'Attachment', fileId: value, url: `/api/v1/files/${value}` }
  })
}

export function serializeLeaveRequest(request) {
  if (!request) return request
  const plain = typeof request.toObject === 'function' ? request.toObject() : { ...request }
  plain.attachments = serializeLeaveAttachments(plain.attachments || [])
  return plain
}

export async function listLeaveHistory({ organizationId, employeeId, query = {} }) {
  const requests = await LeaveRequest.find({
    organization: organizationId,
    employee: employeeId,
    ...historyFilters(query),
  })
    .populate('employee', 'firstName lastName employeeCode department')
    .populate('reviewedBy', 'firstName lastName employeeCode')
    .sort({ createdAt: -1 })
    .lean()

  return requests.map(serializeLeaveRequest)
}

export function historyFilters(query = {}) {
  const filter = {}

  const status = typeof query.status === 'string' ? query.status.trim().toLowerCase() : ''
  if (['draft', 'pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
    filter.status = status
  }

  const leaveType = typeof query.leaveType === 'string' ? query.leaveType.trim() : ''
  const typeAliases = {
    'Casual Leave': 'casual',
    'Sick Leave': 'sick',
    'Earned Leave': 'earned',
    'Unpaid Leave': 'unpaid',
  }
  const normalizedType = typeAliases[leaveType] ?? leaveType
  if (['casual', 'sick', 'earned', 'unpaid'].includes(normalizedType)) {
    filter.leaveType = normalizedType
  }

  if (query.year) {
    const year = Number(query.year)
    if (Number.isFinite(year)) {
      filter.fromDate = {
        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
        $lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      }
    }
  }

  return filter
}
