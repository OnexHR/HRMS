import { z } from "zod";

import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../constants/common.js";

/** 24-character Mongo ObjectId. */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid identifier");

/** Calendar date, `YYYY-MM-DD`. */
export const isoDateSchema = z.iso.date();

/** Full timestamp with timezone offset, e.g. `2026-01-01T09:30:00+05:30`. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const emailSchema = z.email().max(254);

/**
 * Password policy shared by the backend validator and the frontend form.
 * The server remains the authority; the client copy only avoids a round trip.
 */
export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?]).{8,}$/;

export const PASSWORD_HINT =
  "At least 8 characters with one uppercase, one lowercase, one number and one special character.";

export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, PASSWORD_HINT)
  .max(MAX_PASSWORD_LENGTH)
  .regex(PASSWORD_REGEX, PASSWORD_HINT);

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE),
});

export const dateRangeSchema = z
  .object({
    from: isoDateSchema,
    to: isoDateSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: "`from` must be on or before `to`",
    path: ["to"],
  });

/** Optional user-supplied link (meeting, attachment, ...). */
export const urlSchema = z.url().max(2048);

/** Query-string boolean that accepts only `true` / `false`. */
export const booleanQuerySchema = z.stringbool();

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type DateRangeQuery = z.infer<typeof dateRangeSchema>;
