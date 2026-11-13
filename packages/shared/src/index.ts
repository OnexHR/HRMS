/**
 * `@hrms/shared` — framework-agnostic contracts shared by the HRMS frontend
 * and backend.
 *
 * Rules:
 * - No Node built-ins, no React, no Mongoose, no storage-vendor types.
 * - Types describe transport shapes (`{ success, data, error }` envelope).
 * - Constants and schemas are the single source of truth for both sides.
 */

export * from "./constants/common.js";
export * from "./constants/roles.js";
export * from "./constants/employee.js";
export * from "./constants/attendance.js";
export * from "./constants/leave.js";
export * from "./constants/task.js";
export * from "./constants/query.js";
export * from "./constants/meeting.js";
export * from "./constants/file.js";

export * from "./types/api.js";
export * from "./types/organization.js";
export * from "./types/employee.js";
export * from "./types/attendance.js";
export * from "./types/leave.js";
export * from "./types/task.js";
export * from "./types/query.js";
export * from "./types/meeting.js";
export * from "./types/file.js";
export * from "./types/dashboard.js";

export * from "./schemas/common.js";
export * from "./schemas/auth.js";
export * from "./schemas/employee.js";
export * from "./schemas/attendance.js";
export * from "./schemas/leave.js";
export * from "./schemas/task.js";
export * from "./schemas/query.js";
export * from "./schemas/meeting.js";
export * from "./schemas/file.js";
