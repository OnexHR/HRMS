import {
  LEAVE_DAY_TYPES,
  LEAVE_TYPES,
  MAX_LEAVE_ATTACHMENTS,
  MAX_LEAVE_DAYS_PER_REQUEST,
  countLeaveDays,
} from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { dateKey, parseDate, parseDateKey, spanDays } from '../../../lib/dates.js'

const LEAVE_TYPE_ALIASES = {
  'Casual Leave': 'casual',
  'Sick Leave': 'sick',
  'Earned Leave': 'earned',
  'Unpaid Leave': 'unpaid',
  casual: 'casual',
  sick: 'sick',
  earned: 'earned',
  unpaid: 'unpaid',
}

const DAY_TYPE_ALIASES = {
  'Full Day': 'full_day',
  'First Half': 'first_half',
  'Second Half': 'second_half',
  full_day: 'full_day',
  first_half: 'first_half',
  second_half: 'second_half',
}

function normalizeDateKey(value, field, errors) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (parseDateKey(value)) return value
    errors.push(`${field} must be a valid date (YYYY-MM-DD).`)
    return null
  }
  const parsed = parseDate(value)
  if (!parsed) {
    errors.push(`${field} must be a valid date.`)
    return null
  }
  return dateKey(parsed)
}

/**
 * Validates a leave payload against the shared working-day rules.
 *
 * A half day is only valid for one working date and counts as 0.5; a range with
 * no working days is rejected instead of silently producing a zero-day request.
 */
export function validateLeaveRequest(body = {}) {
  const errors = []

  const rawLeaveType = body.leaveType
  const leaveType =
    LEAVE_TYPE_ALIASES[rawLeaveType] ??
    (LEAVE_TYPES.includes(rawLeaveType) ? rawLeaveType : undefined)
  const rawDayType = body.dayType
  const dayType =
    DAY_TYPE_ALIASES[rawDayType] ??
    (LEAVE_DAY_TYPES.includes(rawDayType) ? rawDayType : 'full_day')

  const fromKey = normalizeDateKey(body.fromDate, 'fromDate', errors)
  const toKey = normalizeDateKey(body.toDate, 'toDate', errors)

  if (!leaveType) errors.push('leaveType must be one of casual, sick, earned, unpaid.')
  if (errors.length) throw ApiError.validation('Invalid leave request payload.', { issues: errors })

  if (toKey < fromKey) {
    throw ApiError.validation('Invalid leave request payload.', {
      issues: ['toDate must be on or after fromDate.'],
    })
  }

  if (dayType !== 'full_day' && fromKey !== toKey) {
    throw ApiError.validation('Invalid leave request payload.', {
      issues: ['Half-day leave must be requested for a single date.'],
    })
  }

  if (spanDays(parseDateKey(fromKey), parseDateKey(toKey)) > MAX_LEAVE_DAYS_PER_REQUEST) {
    throw ApiError.validation('Invalid leave request payload.', {
      issues: [`A single request may not exceed ${MAX_LEAVE_DAYS_PER_REQUEST} days.`],
    })
  }

  const days = countLeaveDays(fromKey, toKey, dayType)
  if (days === 0) {
    throw ApiError.validation('Invalid leave request payload.', {
      issues: ['The selected range contains no working days.'],
    })
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments.map((value) => String(value)).filter(Boolean)
    : []
  if (attachments.length > MAX_LEAVE_ATTACHMENTS) {
    throw ApiError.validation('Invalid leave request payload.', {
      issues: [`At most ${MAX_LEAVE_ATTACHMENTS} attachments are allowed.`],
    })
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
  if (reason.length > 500) {
    throw ApiError.validation('Invalid leave request payload.', {
      issues: ['reason must be 500 characters or fewer.'],
    })
  }

  const contact = typeof body.contactWhileOnLeave === 'string' ? body.contactWhileOnLeave.trim() : ''
  if (contact.length > 120) {
    throw ApiError.validation('Invalid leave request payload.', {
      issues: ['contactWhileOnLeave must be 120 characters or fewer.'],
    })
  }

  return {
    leaveType,
    dayType,
    fromDate: parseDateKey(fromKey),
    toDate: parseDateKey(toKey),
    days,
    reason,
    contactWhileOnLeave: contact,
    attachments,
  }
}

export function validateLeaveStatus(body = {}) {
  if (!['approved', 'rejected'].includes(body.status)) {
    throw ApiError.validation("status must be 'approved' or 'rejected'.")
  }

  const note =
    typeof (body.note ?? body.reviewNote) === 'string'
      ? String(body.note ?? body.reviewNote).trim()
      : ''

  if (note.length > 500) {
    throw ApiError.validation('reviewNote must be 500 characters or fewer.')
  }

  return { status: body.status, note }
}
