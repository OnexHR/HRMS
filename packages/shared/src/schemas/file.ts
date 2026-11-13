import { z } from 'zod'

import { FILE_SCOPES, MAX_FILENAME_LENGTH, MAX_MIME_TYPE_LENGTH } from '../constants/file.js'
import {
  isAllowedMimeType,
  isFilenameConsistentWithMime,
  normalizeFilename,
  normalizeMimeType,
} from '../lib/normalize.js'
import type { FileUploadPolicy } from '../types/file.js'
import { objectIdSchema } from './common.js'

/**
 * Builds the upload metadata schema for a resolved policy (M5).
 *
 * The policy is a parameter rather than a module constant: Stage 1 resolves the
 * size limit and allowlist from the environment, and Stage 2 will resolve them
 * per organization. The schema normalizes the MIME type before checking it and
 * enforces both the allowlist and the policy's byte limit.
 */
export function createFileUploadMetadataSchema(policy: FileUploadPolicy) {
  return z
    .object({
      filename: z
        .string()
        .trim()
        .min(1)
        .transform(normalizeFilename)
        .pipe(z.string().min(1).max(MAX_FILENAME_LENGTH)),
      mimeType: z
        .string()
        .trim()
        .min(3)
        .max(MAX_MIME_TYPE_LENGTH)
        .transform(normalizeMimeType)
        .refine(
          (value) => isAllowedMimeType(value, policy.allowedMimeTypes),
          'Unsupported file type',
        ),
      size: z
        .number()
        .int()
        .positive()
        .max(policy.maxSizeBytes, `File must be at most ${policy.maxSizeBytes} bytes`),
      scope: z.enum(FILE_SCOPES).default('general'),
      refId: objectIdSchema.nullish(),
    })
    .superRefine((value, ctx) => {
      if (!isFilenameConsistentWithMime(value.filename, value.mimeType)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Filename extension does not match the file type',
          path: ['filename'],
        })
      }
    })
}

export type FileUploadMetadataInput = z.infer<ReturnType<typeof createFileUploadMetadataSchema>>
