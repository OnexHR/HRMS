import { z } from "zod";

import {
  MAX_QUERY_ATTACHMENTS,
  MAX_QUERY_MESSAGE_LENGTH,
  MAX_QUERY_REVIEW_LENGTH,
  QUERY_STATUSES,
  REVIEWABLE_QUERY_STATUSES,
} from "../constants/query.js";
import { objectIdSchema, paginationQuerySchema } from "./common.js";

export const createQuerySchema = z.object({
  message: z.string().trim().min(1).max(MAX_QUERY_MESSAGE_LENGTH),
  taskId: objectIdSchema.nullish(),
  attachments: z.array(objectIdSchema).max(MAX_QUERY_ATTACHMENTS).default([]),
});

export const reviewQuerySchema = z.object({
  status: z.enum(REVIEWABLE_QUERY_STATUSES),
  review: z.string().trim().max(MAX_QUERY_REVIEW_LENGTH).default(""),
});

export const queryListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(QUERY_STATUSES).optional(),
});

export type CreateQueryInput = z.infer<typeof createQuerySchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
export type QueryListQueryInput = z.infer<typeof queryListQuerySchema>;
