import type {
  LeaveDayType,
  LeaveLedgerEntryType,
  LeaveStatus,
  LeaveType,
} from "../constants/leave.js";
import type { EntityId, ISODateString, Nullable } from "./api.js";
import type { EmployeeSummary } from "./employee.js";
import type { FileMetadata } from "./file.js";

/**
 * Leave shapes.
 *
 * Decision 6 (locked): balances are derived from an append-only ledger, so the
 * API exposes both the current balance view and the entries behind it.
 */

export interface LeaveBalanceBucket {
  leaveType: LeaveType;
  /** Sum of allocation, accrual, carry-forward and positive adjustments. */
  allocated: number;
  /** Sum of approved usage. */
  used: number;
  /** Days held by pending requests. */
  pending: number;
  /** `allocated - used - pending`, never below zero. */
  available: number;
}

export interface LeaveBalance {
  employeeId: EntityId;
  buckets: LeaveBalanceBucket[];
  asOf: ISODateString;
}

export interface LeaveLedgerEntry {
  id: EntityId;
  organizationId: EntityId;
  employeeId: EntityId;
  leaveType: LeaveType;
  entryType: LeaveLedgerEntryType;
  /** Signed: negative for usage/expiry, positive for allocation/reversal. */
  days: number;
  /** Running available balance after this entry, in days. */
  balanceAfter: number;
  effectiveDate: ISODateString;
  requestId: Nullable<EntityId>;
  note: string;
  createdBy: Nullable<EntityId>;
  createdAt: ISODateString;
}

export interface LeaveRequest {
  id: EntityId;
  organizationId: EntityId;
  employeeId: EntityId;
  employee?: EmployeeSummary;
  managerId: Nullable<EntityId>;
  leaveType: LeaveType;
  dayType: LeaveDayType;
  fromDate: ISODateString;
  toDate: ISODateString;
  days: number;
  reason: string;
  contactWhileOnLeave: string;
  attachments: FileMetadata[];
  status: LeaveStatus;
  reviewedBy: Nullable<EntityId>;
  reviewer?: Nullable<EmployeeSummary>;
  reviewNote: string;
  reviewedAt: Nullable<ISODateString>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface LeaveHistoryQuery {
  page?: number;
  pageSize?: number;
  status?: LeaveStatus;
  leaveType?: LeaveType;
  year?: number;
}

/** Reviewer decision. Cancellation is a separate employee action. */
export interface LeaveReviewDecision {
  status: Extract<LeaveStatus, "approved" | "rejected">;
  reviewNote?: string;
}

/** HR adjustment against the ledger. */
export interface LeaveBalanceAdjustment {
  leaveType: LeaveType;
  days: number;
  effectiveDate: ISODateString;
  note?: string;
}

/**
 * Correct day count for a request.
 *
 * A half day is only valid for a single date; multi-day ranges are always
 * full days. Weekends are excluded; an organization holiday calendar is a
 * later addition and will be passed in explicitly.
 */
export function countLeaveDays(
  fromDate: string,
  toDate: string,
  dayType: LeaveDayType,
  workingWeekdays: readonly number[] = [1, 2, 3, 4, 5],
): number {
  const from = new Date(`${fromDate.slice(0, 10)}T00:00:00Z`);
  const to = new Date(`${toDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return 0;
  }
  if (dayType !== "full_day") {
    return from.getTime() === to.getTime() ? 0.5 : 0;
  }
  let days = 0;
  const cursor = new Date(from);
  while (cursor <= to) {
    if (workingWeekdays.includes(cursor.getUTCDay())) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
