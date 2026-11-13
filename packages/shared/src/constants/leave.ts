/**
 * Leave vocabulary and defaults.
 *
 * Decision 6 (locked): leave balances are an **append-only ledger**, not
 * mutable counters. `DEFAULT_LEAVE_ALLOCATION` seeds the yearly allocation
 * entry for each leave type; usage and reversals are separate entries.
 */

export const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_DAY_TYPES = ["full_day", "first_half", "second_half"] as const;
export type LeaveDayType = (typeof LEAVE_DAY_TYPES)[number];

export const LEAVE_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "cancelled",
] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

/**
 * Ledger entry kinds. `usage` is negative, `reversal` restores a previous
 * usage, `allocation`/`accrual`/`carry_forward` add days.
 */
export const LEAVE_LEDGER_ENTRY_TYPES = [
  "allocation",
  "accrual",
  "carry_forward",
  "usage",
  "reversal",
  "adjustment",
  "expiry",
] as const;
export type LeaveLedgerEntryType = (typeof LEAVE_LEDGER_ENTRY_TYPES)[number];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  earned: "Earned Leave",
  unpaid: "Unpaid Leave",
};

export const LEAVE_DAY_TYPE_LABELS: Record<LeaveDayType, string> = {
  full_day: "Full Day",
  first_half: "First Half",
  second_half: "Second Half",
};

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const LEAVE_LEDGER_ENTRY_LABELS: Record<LeaveLedgerEntryType, string> = {
  allocation: "Allocation",
  accrual: "Accrual",
  carry_forward: "Carry Forward",
  usage: "Usage",
  reversal: "Reversal",
  adjustment: "Adjustment",
  expiry: "Expiry",
};

/** Yearly allocation defaults seeded for a new employee. */
export const DEFAULT_LEAVE_ALLOCATION: Record<LeaveType, number> = {
  casual: 12,
  sick: 10,
  earned: 15,
  unpaid: 0,
};

/** Leave types that consume a tracked balance. Unpaid leave is record-only. */
export const PAID_LEAVE_TYPES: readonly LeaveType[] = ["casual", "sick", "earned"];

export const MAX_LEAVE_REASON_LENGTH = 500;
export const MAX_LEAVE_REVIEW_NOTE_LENGTH = 500;
export const MAX_LEAVE_CONTACT_LENGTH = 120;
export const MAX_LEAVE_ATTACHMENTS = 5;
export const MAX_LEAVE_DAYS_PER_REQUEST = 365;
