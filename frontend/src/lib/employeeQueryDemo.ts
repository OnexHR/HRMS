export const EMPLOYEE_QUERIES_UPDATED_EVENT = "hrms:employee-queries-updated";

export type DemoEmployeeQuery = {
  _id: string;
  message: string;
  status: "open" | "in_review" | "resolved" | "raised_again";
  review?: string;
  reviewedAt?: string | null;
  createdAt: string;
  task?: { title?: string; taskId?: string } | null;
  attachment?: DemoEmployeeQueryAttachment | null;
};

export type DemoEmployeeQueryAttachment = {
  name: string;
  key?: string;
  dataUrl?: string;
};

const STORAGE_KEY = "hrms_employee_queries_demo_v1";

function getStorageKey(employeeId: string) {
  return `${STORAGE_KEY}:${encodeURIComponent(employeeId)}`;
}

function createQueryId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `demo-query-${crypto.randomUUID()}`;
  }
  return `demo-query-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDemoEmployeeQuery(value: unknown): value is DemoEmployeeQuery {
  if (!isRecord(value)) return false;
  const taskIsValid =
    value.task === undefined ||
    value.task === null ||
    (isRecord(value.task) &&
      (value.task.title === undefined || typeof value.task.title === "string") &&
      (value.task.taskId === undefined || typeof value.task.taskId === "string"));
  const reviewIsValid = value.review === undefined || typeof value.review === "string";
  const reviewedAtIsValid =
    value.reviewedAt === undefined || value.reviewedAt === null || typeof value.reviewedAt === "string";
  const attachmentIsValid =
    value.attachment === undefined ||
    value.attachment === null ||
    (isRecord(value.attachment) &&
      typeof value.attachment.name === "string" &&
      (value.attachment.key === undefined || typeof value.attachment.key === "string") &&
      (value.attachment.dataUrl === undefined || typeof value.attachment.dataUrl === "string") &&
      (typeof value.attachment.key === "string" || typeof value.attachment.dataUrl === "string"));

  return (
    typeof value._id === "string" &&
    typeof value.message === "string" &&
    ["open", "in_review", "resolved", "raised_again"].includes(String(value.status)) &&
    typeof value.createdAt === "string" &&
    taskIsValid &&
    reviewIsValid &&
    reviewedAtIsValid &&
    attachmentIsValid
  );
}

export function getDemoEmployeeQueries(employeeId: string): DemoEmployeeQuery[] {
  const saved = localStorage.getItem(getStorageKey(employeeId));
  if (!saved) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error("Saved demo queries are invalid. Clear this browser's local storage to continue.");
  }

  if (!Array.isArray(parsed) || !parsed.every(isDemoEmployeeQuery)) {
    throw new Error("Saved demo queries are invalid. Clear this browser's local storage to continue.");
  }
  return parsed;
}

export function notifyEmployeeQueriesChanged() {
  window.dispatchEvent(new Event(EMPLOYEE_QUERIES_UPDATED_EVENT));
}

export function saveDemoEmployeeQuery(input: {
  message: string;
  task?: { title?: string; taskId?: string } | null;
  attachment?: DemoEmployeeQueryAttachment | null;
}, employeeId: string): DemoEmployeeQuery {
  const query: DemoEmployeeQuery = {
    _id: createQueryId(),
    message: input.message,
    status: "open",
    createdAt: new Date().toISOString(),
    task: input.task ?? null,
    attachment: input.attachment ?? null,
  };
  const queries = getDemoEmployeeQueries(employeeId);
  localStorage.setItem(getStorageKey(employeeId), JSON.stringify([query, ...queries]));
  notifyEmployeeQueriesChanged();
  return query;
}
