import { z } from "zod";

import {
  ATTENDANCE_STATUSES,
  MAX_ATTENDANCE_NOTE_LENGTH,
} from "../constants/attendance.js";
import {
  isoDateSchema,
  objectIdSchema,
  paginationQuerySchema,
} from "./common.js";

/**
 * Timestamps are never accepted from the client: check-in/check-out times are
 * derived from the server clock in the organization timezone.
 */
export const attendanceActionSchema = z.object({
  note: z.string().trim().max(MAX_ATTENDANCE_NOTE_LENGTH).optional(),
});

export const attendanceMonthQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

export const attendanceRangeQuerySchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: "`from` must be on or before `to`",
    path: ["to"],
  });

export const teamAttendanceQuerySchema = paginationQuerySchema.extend({
  date: isoDateSchema.optional(),
  status: z.enum(ATTENDANCE_STATUSES).optional(),
  departmentId: objectIdSchema.optional(),
});

export const teamAttendanceMonthQuerySchema = attendanceMonthQuerySchema.extend({
  departmentId: objectIdSchema.optional(),
});

export type AttendanceActionInput = z.infer<typeof attendanceActionSchema>;
export type AttendanceMonthQueryInput = z.infer<typeof attendanceMonthQuerySchema>;
export type AttendanceRangeQueryInput = z.infer<typeof attendanceRangeQuerySchema>;
export type TeamAttendanceQueryInput = z.infer<typeof teamAttendanceQuerySchema>;
export type TeamAttendanceMonthQueryInput = z.infer<
  typeof teamAttendanceMonthQuerySchema
>;
