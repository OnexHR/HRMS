import EmployeeQuery from "../../models/employee/EmployeeQuery.js";
import Task from "../../models/employee/Task.js";
import { badRequest, notFound } from "../../validators/employee/util.validator.js";
import { logActivity } from "./activity.service.js";

const Q_STATUSES = ["open", "in_review", "resolved", "raised_again"];

// A query is a follow-up ("raised again") when the employee already has a query
// against the same task; a first-time query starts as "open".
export const initialQueryStatus = (repeatsTask) => (repeatsTask ? "raised_again" : "open");

export async function raiseQuery(employeeId, body = {}) {
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) throw badRequest("message is required.");
  if (message.length > 500) throw badRequest("message must be 500 characters or fewer.");

  let task = null;
  if (body.task) {
    task = await Task.findOne({ _id: body.task, assignedTo: employeeId }).lean();
    if (!task) throw badRequest("Task not found or not assigned to you.");
  }

  const repeatsTask = Boolean(task && (await EmployeeQuery.exists({ employee: employeeId, task: task._id })));
  const query = await EmployeeQuery.create({
    employee: employeeId,
    task: task?._id || null,
    message,
    status: initialQueryStatus(repeatsTask),
    attachments: Array.isArray(body.attachments) ? body.attachments.map(String).filter(Boolean) : [],
  });

  await logActivity(employeeId, "query_raised", { queryId: query._id });
  return query;
}

export async function reviewQuery(queryId, reviewer, body = {}) {
  const status = body.status;
  if (!Q_STATUSES.includes(status)) {
    throw badRequest("status must be one of open, in_review, resolved, raised_again.");
  }
  const review = typeof body.review === "string" ? body.review.trim() : "";

  const query = await EmployeeQuery.findById(queryId).populate("employee");
  if (!query) throw notFound("Query not found.");

  const isTeam =
    reviewer.role === "admin" ||
    (query.employee?.manager && String(query.employee.manager) === String(reviewer._id));
  if (!isTeam) throw badRequest("You can only review queries from your team.");

  query.status = status;
  query.review = review || query.review;
  query.reviewedBy = reviewer._id;
  query.reviewedAt = new Date();
  await query.save();
  await logActivity(query.employee._id, "query_reviewed", { queryId: query._id, status });
  return query;
}