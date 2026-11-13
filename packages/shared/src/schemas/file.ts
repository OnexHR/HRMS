import { z } from "zod";

import {
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_MAX_UPLOAD_SIZE_MB,
  MAX_FILENAME_LENGTH,
  MAX_MIME_TYPE_LENGTH,
} from "../constants/file.js";

/**
 * Decision 8 (locked): no signed-URL field exists anywhere. Upload metadata is
 * validated here; the bytes travel through the authenticated upload endpoint.
 */
export const fileUploadMetadataSchema = z.object({
  filename: z.string().trim().min(1).max(MAX_FILENAME_LENGTH),
  mimeType: z.string().trim().min(3).max(MAX_MIME_TYPE_LENGTH),
  size: z
    .number()
    .int()
    .positive()
    .max(DEFAULT_MAX_UPLOAD_SIZE_MB * 1024 * 1024),
});

export const filePolicySchema = z.object({
  maxUploadSizeMb: z.number().int().min(1).max(100),
  allowedMimeTypes: z
    .array(z.string().trim().min(3).max(MAX_MIME_TYPE_LENGTH))
    .min(1),
});

export const allowedMimeTypeListSchema = z
  .array(z.string().trim().min(3).max(MAX_MIME_TYPE_LENGTH))
  .min(1)
  .default([...DEFAULT_ALLOWED_MIME_TYPES]);

export type FileUploadMetadataInput = z.infer<typeof fileUploadMetadataSchema>;
export type FilePolicyInput = z.infer<typeof filePolicySchema>;
