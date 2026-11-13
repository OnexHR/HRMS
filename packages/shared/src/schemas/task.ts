import { z } from "zod";

import {
  MAX_TASK_ATTACHMENTS,
  MAX_TASK_DESCRIPTION_LENGTH,
  MAX_TASK_TITLE_LENGTH,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from "../constants/task.js";
import { isoDateSchema, objectIdSchema, paginationQuerySchema } from "./common.js";

/** `assignedBy` and `taskId` are derived on the server, never supplied. */
export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TASK_TITLE_LENGTH),
  description: z.string().trim().max(MAX_TASK_DESCRIPTION_LENGTH).default(""),
  assignedTo: objectIdSchema,
  dueDate: isoDateSchema.nullish(),
  priority: z.enum(TASK_PRIORITIES).default("Medium"),
  attachments: z.array(objectIdSchema).max(MAX_TASK_ATTACHMENTS).default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TASK_TITLE_LENGTH).optional(),
  description: z.string().trim().max(MAX_TASK_DESCRIPTION_LENGTH).optional(),
  dueDate: isoDateSchema.nullish(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  attachments: z.array(objectIdSchema).max(MAX_TASK_ATTACHMENTS).optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(TASK_STATUSES),
});

export const taskListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: objectIdSchema.optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
export type TaskListQueryInput = z.infer<typeof taskListQuerySchema>;
