import Task from "../../models/employee/Task.js";
import { getNextSequence } from "../../models/employee/Counter.js";
import { badRequest, notFound } from "../../validators/employee/util.validator.js";
import { logActivity } from "./activity.service.js";

const STATUSES = ["Not Started", "In Progress", "On Hold", "Pending", "Completed"];
const PRIORITIES = ["High", "Medium", "Low"];
const STATUS_ALIASES = {
  "Not started": "Not Started",
  "In progress": "In Progress",
  "On hold": "On Hold",
  "Pending": "Pending",
  "Completed": "Completed",
};

export function normalizeTaskStatus(value) {
  if (typeof value !== "string") return "Not Started";
  const trimmed = value.trim();
  return STATUS_ALIASES[trimmed] || (STATUSES.includes(trimmed) ? trimmed : "Not Started");
}

export function normalizeTaskPayload(body = {}, errors = []) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const assignedTo = body.assignedTo || body.assignee;
  if (!title) errors.push("title is required.");
  if (!assignedTo || !/^[0-9a-fA-F]{24}$/.test(String(assignedTo))) {
    errors.push("assignedTo is required and must be a valid employee id.");
  }
  return {
    title,
    description: typeof body.description === "string" ? body.description.trim() : "",
    assignedTo: assignedTo ? String(assignedTo) : null,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    priority: PRIORITIES.includes(body.priority) ? body.priority : "Medium",
    status: normalizeTaskStatus(body.status),
    attachments: Array.isArray(body.attachments) ? body.attachments.map(String).filter(Boolean) : [],
  };
}

export async function generateTaskId() {
  const year = new Date().getFullYear();
  const seq = await getNextSequence(`taskId:${year}`);
  return `TSK-${year}-${String(seq).padStart(3, "0")}`;
}

export async function assignTask(assigner, body = {}) {
  const errors = [];
  const payload = normalizeTaskPayload(body, errors);
  if (errors.length) throw badRequest("Invalid task payload.", errors);

  const Employee = (await import("../../models/employee/Employee.js")).default;
  const assignee = await Employee.findById(payload.assignedTo).lean();
  if (!assignee || !assignee.job?.isActive) throw badRequest("Assigned employee does not exist.");

  const canAssign =
    assigner.role === "manager" || assigner.role === "admin"
      ? true
      : await isTeamMember(assigner._id, assignee._id);

  const effectiveBy =
    assigner.role === "admin" || assigner.role === "manager" ? assigner._id : assignee.manager;

  if (!canAssign) throw badRequest("You can only assign tasks to your team members.");

  const task = await Task.create({
    ...payload,
    taskId: await generateTaskId(),
    assignedTo: assignee._id,
    assignedBy: effectiveBy || assigner._id,
  });
  return task;
}

async function isTeamMember(managerId, employeeId) {
  const Employee = (await import("../../models/employee/Employee.js")).default;
  const member = await Employee.findOne({ _id: employeeId, manager: managerId }).lean();
  return Boolean(member);
}

// A populated field is a document, not an ObjectId, and String(doc) inspects
// the whole thing in Mongoose 8. Read the id off either shape.
const idOf = (value) => {
  if (!value) return null;
  const id = typeof value === "object" ? value._id : value;
  return id ? String(id) : null;
};

export async function canManageTask(actor, task) {
  const actorId = idOf(actor);
  if (actor.role === "admin") return true;
  if (actor.role === "manager") {
    return (
      idOf(task.assignedBy) === actorId ||
      idOf(task.assignedTo?.manager) === actorId ||
      (await isTeamMember(actorId, idOf(task.assignedTo)))
    );
  }
  return idOf(task.assignedTo) === actorId;
}

export async function updateTaskStatus(actor, taskId, body = {}) {
  const task = await Task.findById(taskId).populate("assignedTo");
  if (!task) throw notFound("Task not found.");
  const nextStatus = normalizeTaskStatus(body.status);
  if (!STATUSES.includes(nextStatus)) throw badRequest("Invalid task status.");

  if (!(await canManageTask(actor, task))) {
    throw badRequest("You do not have permission to update this task.");
  }

  task.status = nextStatus;
  if (nextStatus === "Completed") {
    task.completedAt = new Date();
    await logActivity(task.assignedTo._id, "task_completed", { taskId: task.taskId, title: task.title });
  } else {
    task.completedAt = null;
  }
  await task.save();
  return task;
}

export async function getTaskSummaryFor(employeeId) {
  const all = await Task.find({ assignedTo: employeeId });
  const now = new Date();
  return {
    total: all.length,
    completed: all.filter((t) => t.status === "Completed").length,
    inProgress: all.filter((t) => t.status === "In Progress").length,
    onHold: all.filter((t) => t.status === "On Hold").length,
    pending: all.filter((t) => t.status === "Pending").length,
    overdue: all.filter((t) => t.dueDate && t.dueDate < now && t.status !== "Completed").length,
  };
}