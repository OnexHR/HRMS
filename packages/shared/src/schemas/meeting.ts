import { z } from 'zod'

import {
  MAX_MEETING_DURATION_MINUTES,
  MAX_MEETING_PARTICIPANTS,
  MAX_MEETING_TITLE_LENGTH,
  MIN_MEETING_DURATION_MINUTES,
} from '../constants/meeting.js'
import { isoDateTimeSchema, objectIdSchema, urlSchema } from './common.js'

/**
 * Decision 7 (locked): the link is optional and user-supplied. There is no
 * generated Google Meet/Zoom/Teams URL and therefore no provider field.
 */
export const createMeetingSchema = z.object({
  title: z.string().trim().min(1).max(MAX_MEETING_TITLE_LENGTH),
  meetingLink: urlSchema.nullish(),
  participants: z
    .array(objectIdSchema)
    .min(1, 'Select at least one participant')
    .max(MAX_MEETING_PARTICIPANTS),
  startTime: isoDateTimeSchema,
  durationMin: z.number().int().min(MIN_MEETING_DURATION_MINUTES).max(MAX_MEETING_DURATION_MINUTES),
})

export const updateMeetingSchema = z.object({
  title: z.string().trim().min(1).max(MAX_MEETING_TITLE_LENGTH).optional(),
  meetingLink: urlSchema.nullish(),
  startTime: isoDateTimeSchema.optional(),
  durationMin: z
    .number()
    .int()
    .min(MIN_MEETING_DURATION_MINUTES)
    .max(MAX_MEETING_DURATION_MINUTES)
    .optional(),
})

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>
