import { z } from 'zod'

import { emailSchema, passwordInputSchema, passwordSchema } from './common.js'

/**
 * Authentication payloads are strict (M17): unknown keys are rejected rather
 * than silently stripped, so a typo cannot look like a successful request.
 *
 * Existing-password fields use `passwordInputSchema`: a legacy donor password
 * longer than 72 bytes is accepted and truncated to bcrypt's effective length.
 * Only `newPassword` is subject to the full new-password policy.
 */
export const loginSchema = z
  .object({
    email: emailSchema,
    password: passwordInputSchema,
  })
  .strict()

export const changePasswordSchema = z
  .object({
    currentPassword: passwordInputSchema,
    newPassword: passwordSchema,
  })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must differ from the current password',
    path: ['newPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
