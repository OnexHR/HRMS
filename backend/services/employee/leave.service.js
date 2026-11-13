import LeaveRequest from "../../models/employee/LeaveRequest.js";
import {
  validateLeaveRequest,
  validateLeaveStatus,
} from "../../validators/employee/leave.validator.js";
import { badRequest, notFound } from "../../validators/employee/util.validator.js";
import { logActivity } from "./activity.service.js";

export function balanceView(employee) {
  const b = employee.leaveBalances || {};
  const map = (key, label) => ({
    label,
    total: b[key]?.total ?? 0,
    used: b[key]?.used ?? 0,
    remaining: Math.max(0, (b[key]?.total ?? 0) - (b[key]?.used ?? 0)),
  });
  return {
    casual: map("casual", "Casual Leave"),
    sick: map("sick", "Sick Leave"),
    earned: map("earned", "Earned Leave"),
    unpaid: map("unpaid", "Unpaid Leave"),
  };
}

function remainingFor(employee, leaveType) {
  const bucket = employee.leaveBalances?.[leaveType] || { total: 0, used: 0 };
  return Math.max(0, (bucket.total || 0) - (bucket.used || 0));
}

export async function createLeaveRequest(employee, body = {}, saveAsDraft = false) {
  const payload = validateLeaveRequest(body);

  if (!saveAsDraft && payload.leaveType !== "unpaid") {
    const pendingBalance = await pendingDaysFor(employee._id);
    const pendingTotal = pendingBalance[leaveKey(payload.leaveType)] || 0;
    const remaining = remainingFor(employee, payload.leaveType) - pendingTotal;
    if (payload.days > remaining) {
      throw badRequest(
        `Insufficient ${payload.leaveType} leave balance (${payload.days} requested, ${remaining} available).`,
      );
    }
  }

  const doc = await LeaveRequest.create({
    ...payload,
    employee: employee._id,
    manager: employee.manager || null,
    status: saveAsDraft ? "draft" : "pending",
  });
  if (!saveAsDraft) {
    await logActivity(employee._id, "leave_submitted", { leaveId: doc._id, days: doc.days });
  }
  return doc;
}

function leaveKey(type) {
  return type;
}

export async function pendingDaysFor(employeeId) {
  const requests = await LeaveRequest.find({
    employee: employeeId,
    status: "pending",
  }).lean();
  const totals = {};
  for (const r of requests) {
    totals[r.leaveType] = (totals[r.leaveType] || 0) + r.days;
  }
  return totals;
}

export async function updateDraft(employeeId, requestId, body = {}) {
  const doc = await LeaveRequest.findOne({ _id: requestId, employee: employeeId, status: "draft" });
  if (!doc) throw notFound("Draft leave request not found.");
  const payload = validateLeaveRequest(body);
  Object.assign(doc, payload);
  await doc.save();
  return doc;
}

export async function cancelRequest(employeeId, requestId) {
  const doc = await LeaveRequest.findOne({ _id: requestId, employee: employeeId });
  if (!doc) throw notFound("Leave request not found.");
  if (!["pending", "draft"].includes(doc.status)) {
    throw badRequest("Only pending or draft requests can be cancelled.");
  }
  doc.status = "cancelled";
  await doc.save();
  return doc;
}

export async function reviewRequest(requestId, reviewer, body = {}) {
  const { status, note } = validateLeaveStatus(body);
  const doc = await LeaveRequest.findById(requestId).populate("employee");
  if (!doc) throw notFound("Leave request not found.");
  if (doc.status === "approved" || doc.status === "rejected") {
    throw badRequest("Leave request has already been reviewed.");
  }
  if (!doc.employee || String(doc.employee.manager) !== String(reviewer._id)) {
    throw badRequest("This leave request does not belong to your team.");
  }

  doc.status = status;
  doc.reviewedBy = reviewer._id;
  doc.reviewNote = note || "";
  doc.reviewedAt = new Date();

  if (status === "approved" && doc.leaveType !== "unpaid") {
    const employee = doc.employee;
    const bucket = employee.leaveBalances[doc.leaveType] || { total: 0, used: 0 };
    const remaining = Math.max(0, (bucket.total || 0) - (bucket.used || 0));
    if (doc.days > remaining) {
      throw badRequest(
        `Cannot approve: insufficient ${doc.leaveType} balance (${doc.days} requested, ${remaining} available).`,
      );
    }
    employee.leaveBalances[doc.leaveType].used = (bucket.used || 0) + doc.days;
    await employee.save();
  }

  await doc.save();
  await logActivity(doc.employee._id, status === "approved" ? "leave_approved" : "leave_rejected", {
    leaveId: doc._id,
    reviewedBy: reviewer._id,
  });
  return doc;
}

export async function pendingForManager(managerId) {
  return LeaveRequest.find({
    manager: managerId,
    status: "pending",
  })
    .sort({ fromDate: 1 })
    .populate("employee", "firstName lastName employeeCode department");
}

export function historyFilters(query = {}) {
  const filter = {};
  const normalizedStatus =
    typeof query.status === "string" ? query.status.trim().toLowerCase() : query.status;
  const normalizedLeaveType =
    typeof query.leaveType === "string" ? query.leaveType.trim() : query.leaveType;

  if (normalizedStatus && ["draft", "pending", "approved", "rejected", "cancelled"].includes(normalizedStatus)) {
    filter.status = normalizedStatus;
  } else if (query.status && ["Approved", "Rejected", "Pending"].includes(query.status)) {
    filter.status = query.status.toLowerCase();
  }

  if (normalizedLeaveType && ["casual", "sick", "earned", "unpaid"].includes(normalizedLeaveType)) {
    filter.leaveType = normalizedLeaveType;
  } else if (query.leaveType && { "Casual Leave": "casual", "Sick Leave": "sick", "Earned Leave": "earned", "Unpaid Leave": "unpaid" }[query.leaveType]) {
    filter.leaveType = { "Casual Leave": "casual", "Sick Leave": "sick", "Earned Leave": "earned", "Unpaid Leave": "unpaid" }[query.leaveType];
  }
  if (query.year) {
    const y = Number(query.year);
    if (Number.isFinite(y)) {
      filter.fromDate = { $gte: new Date(`${y}-01-01`), $lt: new Date(`${y + 1}-01-01`) };
    }
  }
  return filter;
}