/**
 * Leave vocabulary and Stage 1 defaults.
 *
 * Stage 1 keeps the donor's mutable counters (D5): every employee starts with
 * the yearly allocation below. The append-only ledger is a Stage 2 concern and
 * is deliberately not part of this package yet.
 */

export const LEAVE_TYPES = ['casual', 'sick', 'earned', 'unpaid'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]

export const LEAVE_DAY_TYPES = ['full_day', 'first_half', 'second_half'] as const
export type LeaveDayType = (typeof LEAVE_DAY_TYPES)[number]

export const LEAVE_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled'] as const
export type LeaveStatus = (typeof LEAVE_STATUSES)[number]

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: 'Casual Leave',
  sick: 'Sick Leave',
  earned: 'Earned Leave',
  unpaid: 'Unpaid Leave',
}

export const LEAVE_DAY_TYPE_LABELS: Record<LeaveDayType, string> = {
  full_day: 'Full Day',
  first_half: 'First Half',
  second_half: 'Second Half',
}

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

/** Yearly allocation defaults seeded for a new employee (donor parity). */
export const DEFAULT_LEAVE_ALLOCATION: Record<LeaveType, number> = {
  casual: 12,
  sick: 10,
  earned: 15,
  unpaid: 0,
}

/** Leave types that consume a tracked balance. Unpaid leave is record-only. */
export const PAID_LEAVE_TYPES: readonly LeaveType[] = ['casual', 'sick', 'earned']

export const MAX_LEAVE_REASON_LENGTH = 500
export const MAX_LEAVE_REVIEW_NOTE_LENGTH = 500
export const MAX_LEAVE_CONTACT_LENGTH = 120
export const MAX_LEAVE_ATTACHMENTS = 5
export const MAX_LEAVE_DAYS_PER_REQUEST = 365
