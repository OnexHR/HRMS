import Task from "../../models/employee/Task.js";
import {
  assignTask,
  canManageTask,
  getTaskSummaryFor,
  normalizeTaskStatus,
  updateTaskStatus,
} from "../../services/employee/task.service.js";
import { signGetUrl } from "../../services/employee/s3.service.js";

const isHttpUrl = (value) => /^https?:\/\//i.test(value);

// Original file name from the last path segment of a key (or URL).
const attachmentNameFromKey = (key) => {
  const last = String(key).split("?")[0].split("/").pop() || String(key);
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};

// Content-Type derived from the extension so the browser opens the file inline.
const contentTypeFromName = (name) => {
  const ext = String(name).split(".").pop()?.toLowerCase();
  const map = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    txt: "text/plain",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext] || "application/octet-stream";
};

// Normalize one attachment to { name, key, url }. A plain string is treated as
// the S3 key (a full http(s) URL is passed through as the url). If signing
// fails the url is left undefined so one bad file never fails the whole request.
async function signAttachment(att) {
  if (typeof att === "string") {
    if (isHttpUrl(att)) return { name: attachmentNameFromKey(att), key: undefined, url: att };
    const key = att;
    const name = attachmentNameFromKey(key);
    try {
      const url = await signGetUrl(key, { expiresIn: 3600, contentType: contentTypeFromName(name) });
      return { name, key, url };
    } catch (err) {
      console.error("Failed to sign task attachment URL:", err);
      return { name, key, url: undefined };
    }
  }
  const key = att?.key;
  const name = att?.name ?? att?.fileName ?? att?.originalName ?? attachmentNameFromKey(key) ?? "Attachment";
  if (!key) return { name, key: undefined, url: att?.url };
  try {
    const url = await signGetUrl(key, { expiresIn: 3600, contentType: contentTypeFromName(name) });
    return { name, key, url };
  } catch (err) {
    console.error("Failed to sign task attachment URL:", err);
    return { name, key, url: undefined };
  }
}

const TASK_POPULATE = [
  { path: "assignedTo", select: "firstName lastName employeeCode department" },
  { path: "assignedBy", select: "firstName lastName employeeCode" },
];

export const handleAssignTask = async (req, res) => {
  try {
    const task = await assignTask(req.employee, req.body || {});
    return res.status(201).json({ task });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Assign task error:", error);
    return res.status(500).json({ message: "Could not assign task." });
  }
};

export const handleMyTasks = async (req, res) => {
  try {
    const { status, priority, search } = req.query;
    const filter = { assignedTo: req.employee._id };
    if (status) filter.status = normalizeTaskStatus(status);
    if (priority) filter.priority = priority;
    if (search) filter.title = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const tasks = await Task.find(filter)
      .populate(TASK_POPULATE)
      .sort({ dueDate: 1 })
      .lean();
    // Attach a signed GET url to each attachment so the frontend can open it.
    const signedTasks = await Promise.all(
      tasks.map(async (task) => {
        if (!task.attachments?.length) return task;
        const attachments = await Promise.all(task.attachments.map(signAttachment));
        return { ...task, attachments };
      }),
    );
    const summary = await getTaskSummaryFor(req.employee._id);
    return res.status(200).json({ tasks: signedTasks, summary });
  } catch (error) {
    console.error("My tasks error:", error);
    return res.status(500).json({ message: "Could not load tasks." });
  }
};

export const handleGetTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(TASK_POPULATE);
    if (!task) return res.status(404).json({ message: "Task not found." });
    if (!(await canManageTask(req.employee, task))) {
      return res.status(403).json({ message: "Access denied." });
    }
    return res.status(200).json({ task });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Get task error:", error);
    return res.status(500).json({ message: "Could not load task." });
  }
};

// Fresh signed GET url for a single task attachment. Employee-authenticated and
// ownership-checked, so the signed url can be re-issued after it expires without
// reloading the whole task list.
export const handleGetTaskAttachmentUrl = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found." });
    if (!(await canManageTask(req.employee, task))) {
      return res.status(403).json({ message: "Access denied." });
    }
    const index = Number(req.params.index);
    const att = task.attachments?.[index];
    if (!att) return res.status(404).json({ message: "Attachment not found." });

    // A plain string is the key; a full http(s) URL is already openable.
    const key = typeof att === "string" ? att : att?.key;
    if (!key) return res.status(200).json({ url: typeof att === "string" ? undefined : att?.url });
    if (isHttpUrl(key)) return res.status(200).json({ url: key });

    const name =
      typeof att === "string"
        ? attachmentNameFromKey(att)
        : att?.name ?? att?.fileName ?? att?.originalName ?? attachmentNameFromKey(key);
    const url = await signGetUrl(key, { expiresIn: 3600, contentType: contentTypeFromName(name) });
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Get task attachment URL error:", error);
    return res.status(500).json({ message: "Could not get attachment URL." });
  }
};

export const handleUpdateTaskStatus = async (req, res) => {
  try {
    const task = await updateTaskStatus(req.employee, req.params.id, req.body || {});
    return res.status(200).json({ task });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Update task status error:", error);
    return res.status(500).json({ message: "Could not update task." });
  }
};

export const handleTeamTasks = async (req, res) => {
  try {
    const { status, priority, assignee } = req.query;
    const filter = { assignedBy: req.employee._id };
    if (status) filter.status = normalizeTaskStatus(status);
    if (priority) filter.priority = priority;
    if (assignee) filter.assignedTo = assignee;

    const tasks = await Task.find(filter)
      .populate(TASK_POPULATE)
      .sort({ dueDate: 1 })
      .lean();
    return res.status(200).json({ tasks });
  } catch (error) {
    console.error("Team tasks error:", error);
    return res.status(500).json({ message: "Could not load team tasks." });
  }
};

export const handleTeamTaskSummary = async (req, res) => {
  try {
    const Employee = (await import("../../models/employee/Employee.js")).default;
    const team = await Employee.find({ manager: req.employee._id, "job.isActive": true }).select("_id").lean();
    const ids = team.map((m) => m._id);
    const all = ids.length ? await Task.find({ assignedTo: { $in: ids } }).lean() : [];
    const now = new Date();
    return res.status(200).json({
      total: all.length,
      completed: all.filter((t) => t.status === "Completed").length,
      inProgress: all.filter((t) => t.status === "In Progress").length,
      onHold: all.filter((t) => t.status === "On Hold").length,
      pending: all.filter((t) => t.status === "Pending").length,
      overdue: all.filter((t) => t.dueDate && t.dueDate < now && t.status !== "Completed").length,
    });
  } catch (error) {
    console.error("Team task summary error:", error);
    return res.status(500).json({ message: "Could not load task summary." });
  }
};