import { badRequest, optionalDate, optionalString } from "./util.validator.js";
import { countLeaveDays } from "./attendance.validator.js";

const LEAVE_TYPES = ["casual", "sick", "earned", "unpaid"];
const DAY_TYPES = ["full_day", "first_half", "second_half"];
const LEAVE_TYPE_ALIASES = {
  "Casual Leave": "casual",
  "Sick Leave": "sick",
  "Earned Leave": "earned",
  "Unpaid Leave": "unpaid",
  casual: "casual",
  sick: "sick",
  earned: "earned",
  unpaid: "unpaid",
};
const DAY_TYPE_ALIASES = {
  "Full Day": "full_day",
  "First Half": "first_half",
  "Second Half": "second_half",
  full_day: "full_day",
  first_half: "first_half",
  second_half: "second_half",
};

export function validateLeaveRequest(body = {}) {
  const errors = [];

  const rawLeaveType = body.leaveType;
  const leaveType = LEAVE_TYPE_ALIASES[rawLeaveType] || (LEAVE_TYPES.includes(rawLeaveType) ? rawLeaveType : undefined);
  const rawDayType = body.dayType;
  const dayType = DAY_TYPE_ALIASES[rawDayType] || (DAY_TYPES.includes(rawDayType) ? rawDayType : "full_day");
  const fromDate = optionalDate(body.fromDate);
  const toDate = optionalDate(body.toDate);
  const reason = optionalString(body.reason, 1000);
  const contact = optionalString(body.contactWhileOnLeave, 100);
  const attachments = Array.isArray(body.attachments)
    ? body.attachments.map((a) => String(a)).filter(Boolean)
    : [];

  if (!leaveType) errors.push("leaveType must be one of casual, sick, earned, unpaid.");
  if (!fromDate) errors.push("A valid fromDate is required.");
  if (!toDate) errors.push("A valid toDate is required.");
  if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
    errors.push("toDate must be on or after fromDate.");
  }
  if (errors.length) throw badRequest("Invalid leave request payload.", errors);

  return {
    leaveType,
    dayType,
    fromDate,
    toDate,
    days: countLeaveDays(fromDate, toDate, dayType),
    reason,
    contactWhileOnLeave: contact,
    attachments,
  };
}

export function validateLeaveStatus(body = {}) {
  const status = body.status;
  if (!["approved", "rejected"].includes(status)) {
    throw badRequest("status must be 'approved' or 'rejected'.");
  }
  return {
    status,
    note: optionalString(body.note || body.reviewNote, 500),
  };
}