import { z } from 'zod'

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_PASSWORD_BYTES,
  MAX_PASSWORD_INPUT_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from '../constants/common.js'
import { truncateUtf8, utf8ByteLength } from '../lib/text.js'

/** 24-character Mongo ObjectId. */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid identifier')

/** Calendar date, `YYYY-MM-DD`. */
export const isoDateSchema = z.iso.date()

/** Full timestamp with timezone offset, e.g. `2026-01-01T09:30:00+05:30`. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true })

/** Email input is trimmed and lowercased before format validation. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

/**
 * Password policy shared by the backend validator and the frontend form.
 * The server remains the authority; the client copy only avoids a round trip.
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?]).{8,}$/

export const PASSWORD_HINT =
  'At least 8 characters with one uppercase, one lowercase, one number and one special character (maximum 72 bytes).'

const PASSWORD_BYTES_MESSAGE = `Password must be at most ${MAX_PASSWORD_BYTES} bytes`

/** New-password policy. Enforces bcrypt's 72-byte truncation limit (M10). */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, PASSWORD_HINT)
  .max(MAX_PASSWORD_LENGTH, PASSWORD_BYTES_MESSAGE)
  .refine((value) => utf8ByteLength(value) <= MAX_PASSWORD_BYTES, PASSWORD_BYTES_MESSAGE)
  .regex(PASSWORD_REGEX, PASSWORD_HINT)

/**
 * Existing-password input (login, current password).
 *
 * The policy above is only applied when a *new* password is set. The donor
 * never capped password length, so a legacy account may have a password longer
 * than 72 bytes. bcrypt only consumes the first 72 UTF-8 bytes, so the input is
 * truncated to exactly those bytes before it reaches the auth service. This
 * keeps donor logins working without weakening the effective credential.
 */
export const passwordInputSchema = z
  .string()
  .min(1, 'Password is required')
  .max(
    MAX_PASSWORD_INPUT_LENGTH,
    `Password must be at most ${MAX_PASSWORD_INPUT_LENGTH} characters`,
  )
  .transform((value) => truncateUtf8(value, MAX_PASSWORD_BYTES))

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export const dateRangeSchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: '`from` must be on or before `to`',
    path: ['to'],
  })

/** Optional user-supplied link (meeting, attachment, ...). */
export const urlSchema = z.url().max(2048)

/** Query-string boolean that accepts only `true` / `false` (case-insensitive). */
export const booleanQuerySchema = z.stringbool({ truthy: ['true'], falsy: ['false'] })

export type PaginationQuery = z.infer<typeof paginationQuerySchema>
export type DateRangeQuery = z.infer<typeof dateRangeSchema>
