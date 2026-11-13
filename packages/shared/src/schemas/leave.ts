import { z } from 'zod'

import {
  LEAVE_DAY_TYPES,
  LEAVE_STATUSES,
  LEAVE_TYPES,
  MAX_LEAVE_ATTACHMENTS,
  MAX_LEAVE_CONTACT_LENGTH,
  MAX_LEAVE_DAYS_PER_REQUEST,
  MAX_LEAVE_REASON_LENGTH,
  MAX_LEAVE_REVIEW_NOTE_LENGTH,
} from '../constants/leave.js'
import { countLeaveDays } from '../lib/leave.js'
import { isoDateSchema, objectIdSchema, paginationQuerySchema } from './common.js'

/**
 * Leave request validation.
 *
 * A half day is only meaningful for a single working date, so any half-day
 * request spanning multiple dates is rejected here rather than silently
 * counted as 0.5 days (the legacy behaviour). A request that covers no working
 * days at all is also rejected, which closes the weekend half-day gap (M1/B5).
 */
export const createLeaveRequestSchema = z
  .object({
    leaveType: z.enum(LEAVE_TYPES),
    dayType: z.enum(LEAVE_DAY_TYPES).default('full_day'),
    fromDate: isoDateSchema,
    toDate: isoDateSchema,
    reason: z.string().trim().max(MAX_LEAVE_REASON_LENGTH).default(''),
    contactWhileOnLeave: z.string().trim().max(MAX_LEAVE_CONTACT_LENGTH).default(''),
    attachments: z.array(objectIdSchema).max(MAX_LEAVE_ATTACHMENTS).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.fromDate > value.toDate) {
      ctx.addIssue({
        code: 'custom',
        message: '`toDate` must be on or after `fromDate`',
        path: ['toDate'],
      })
      return
    }
    if (value.dayType !== 'full_day' && value.fromDate !== value.toDate) {
      ctx.addIssue({
        code: 'custom',
        message: 'Half-day leave must be requested for a single date',
        path: ['dayType'],
      })
      return
    }
    if (countLeaveDays(value.fromDate, value.toDate, value.dayType) === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'The selected range contains no working days',
        path: ['toDate'],
      })
      return
    }
    const from = new Date(`${value.fromDate}T00:00:00Z`)
    const to = new Date(`${value.toDate}T00:00:00Z`)
    const spanDays = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1
    if (spanDays > MAX_LEAVE_DAYS_PER_REQUEST) {
      ctx.addIssue({
        code: 'custom',
        message: `A single request may not exceed ${MAX_LEAVE_DAYS_PER_REQUEST} days`,
        path: ['toDate'],
      })
    }
  })

export const updateLeaveDraftSchema = createLeaveRequestSchema

export const leaveHistoryQuerySchema = paginationQuerySchema.extend({
  status: z.enum(LEAVE_STATUSES).optional(),
  leaveType: z.enum(LEAVE_TYPES).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
})

export const reviewLeaveSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().trim().max(MAX_LEAVE_REVIEW_NOTE_LENGTH).default(''),
})

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>
export type UpdateLeaveDraftInput = z.infer<typeof updateLeaveDraftSchema>
export type LeaveHistoryQueryInput = z.infer<typeof leaveHistoryQuerySchema>
export type ReviewLeaveInput = z.infer<typeof reviewLeaveSchema>
