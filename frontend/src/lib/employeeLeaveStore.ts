export type EmployeeLeaveRequest = {
  id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  dayType: string;
  reason: string;
  contactWhileOnLeave: string;
  attachments: string[];
  status: "pending" | "draft";
  createdAt: string;
};

type NewLeaveRequest = Omit<EmployeeLeaveRequest, "id" | "days" | "status" | "createdAt">;

const STORAGE_KEY = "hrms_employee_leave_requests_v1";
export const EMPLOYEE_LEAVE_REQUESTS_EVENT = "employee-leave-requests-updated";
export const EMPLOYEE_LEAVE_DRAFT_EDIT_EVENT = "employee-leave-draft-edit";

function isLeaveRequest(value: unknown): value is EmployeeLeaveRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;

  return (
    typeof request.id === "string" &&
    typeof request.leaveType === "string" &&
    typeof request.fromDate === "string" &&
    typeof request.toDate === "string" &&
    typeof request.days === "number" &&
    typeof request.dayType === "string" &&
    typeof request.reason === "string" &&
    typeof request.contactWhileOnLeave === "string" &&
    Array.isArray(request.attachments) &&
    request.attachments.every((attachment) => typeof attachment === "string") &&
    (request.status === "pending" || request.status === "draft") &&
    typeof request.createdAt === "string"
  );
}

export function getEmployeeLeaveRequests(): EmployeeLeaveRequest[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("Saved leave requests are invalid. Clear this browser's leave request data to continue.");
  }

  if (!Array.isArray(value) || !value.every(isLeaveRequest)) {
    throw new Error("Saved leave requests are invalid. Clear this browser's leave request data to continue.");
  }
  return value;
}

export function saveEmployeeLeaveRequest(
  request: NewLeaveRequest,
  status: EmployeeLeaveRequest["status"],
  existingId?: string,
) {
  const from = new Date(`${request.fromDate}T00:00:00`);
  const to = new Date(`${request.toDate}T00:00:00`);
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to < from) {
    throw new Error("Please choose a valid date range.");
  }

  const days = Math.floor((to.getTime() - from.getTime()) / 86400000) + 1;
  const storedRequests = getEmployeeLeaveRequests();
  const existingRequest = existingId
    ? storedRequests.find((savedRequest) => savedRequest.id === existingId && savedRequest.status === "draft")
    : undefined;
  if (existingId && !existingRequest) {
    throw new Error("This draft is no longer available. Reload the draft list and try again.");
  }

  const record: EmployeeLeaveRequest = {
    ...request,
    days,
    id: existingRequest?.id ?? globalThis.crypto.randomUUID(),
    status,
    createdAt: existingRequest?.createdAt ?? new Date().toISOString(),
  };
  const requests = existingRequest
    ? storedRequests.map((savedRequest) => (savedRequest.id === existingId ? record : savedRequest))
    : [record, ...storedRequests];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  window.dispatchEvent(new Event(EMPLOYEE_LEAVE_REQUESTS_EVENT));
  return record;
}

export function editEmployeeLeaveDraft(id: string) {
  window.dispatchEvent(new CustomEvent(EMPLOYEE_LEAVE_DRAFT_EDIT_EVENT, { detail: { id } }));
}
