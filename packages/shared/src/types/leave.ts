import type { LeaveDayType, LeaveStatus, LeaveType } from '../constants/leave.js'
import type { EntityId, ISODateString, Nullable } from './api.js'
import type { EmployeeSummary } from './employee.js'
import type { FileResource } from './file.js'

/**
 * Leave shapes.
 *
 * Stage 1 uses the donor's mutable counters (D5): a balance bucket is a simple
 * `{ label, total, used, remaining }` view. The append-only ledger is deferred
 * to Stage 2 and is intentionally absent from these contracts.
 */

export interface LeaveBalanceBucket {
  /** Display label, e.g. `"Casual Leave"`. */
  label: string
  total: number
  used: number
  remaining: number
}

export interface LeaveBalance {
  employeeId: EntityId
  buckets: LeaveBalanceBucket[]
  asOf: ISODateString
}

export interface LeaveRequest {
  id: EntityId
  organizationId: EntityId
  employeeId: EntityId
  employee?: EmployeeSummary
  managerId: Nullable<EntityId>
  leaveType: LeaveType
  dayType: LeaveDayType
  fromDate: ISODateString
  toDate: ISODateString
  days: number
  reason: string
  contactWhileOnLeave: string
  attachments: FileResource[]
  status: LeaveStatus
  reviewedBy: Nullable<EntityId>
  reviewer?: Nullable<EmployeeSummary>
  reviewNote: string
  reviewedAt: Nullable<ISODateString>
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface LeaveHistoryQuery {
  page?: number
  pageSize?: number
  status?: LeaveStatus
  leaveType?: LeaveType
  year?: number
}

/** Reviewer decision. Cancellation is a separate employee action. */
export interface LeaveReviewDecision {
  status: Extract<LeaveStatus, 'approved' | 'rejected'>
  reviewNote?: string
}
