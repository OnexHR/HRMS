import LeaveRequest from "../../models/employee/LeaveRequest.js";
import {
  balanceView,
  createLeaveRequest,
  cancelRequest,
  historyFilters,
  pendingForManager,
  reviewRequest,
  updateDraft,
} from "../../services/employee/leave.service.js";

export const handleBalance = async (req, res) => {
  try {
    return res.status(200).json({ balance: balanceView(req.employee) });
  } catch (error) {
    console.error("Leave balance error:", error);
    return res.status(500).json({ message: "Could not load leave balance." });
  }
};

export const handleSubmitLeave = async (req, res) => {
  try {
    const saved = await createLeaveRequest(req.employee, req.body || {}, false);
    return res.status(201).json({ leaveRequest: saved });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Submit leave error:", error);
    return res.status(500).json({ message: "Could not submit leave request." });
  }
};

export const handleSaveDraft = async (req, res) => {
  try {
    const saved = await createLeaveRequest(req.employee, req.body || {}, true);
    return res.status(201).json({ leaveRequest: saved });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Save leave draft error:", error);
    return res.status(500).json({ message: "Could not save leave draft." });
  }
};

export const handleUpdateDraft = async (req, res) => {
  try {
    const doc = await updateDraft(req.employee._id, req.params.id, req.body || {});
    return res.status(200).json({ leaveRequest: doc });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    console.error("Update leave draft error:", error);
    return res.status(500).json({ message: "Could not update leave draft." });
  }
};

export const handleCancelLeave = async (req, res) => {
  try {
    const doc = await cancelRequest(req.employee._id, req.params.id);
    return res.status(200).json({ leaveRequest: doc });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Cancel leave error:", error);
    return res.status(500).json({ message: "Could not cancel leave request." });
  }
};

export const handleHistory = async (req, res) => {
  try {
    const filter = { employee: req.employee._id, ...historyFilters(req.query) };
    const requests = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    return res.status(200).json({ leaveRequests: requests });
  } catch (error) {
    console.error("Leave history error:", error);
    return res.status(500).json({ message: "Could not load leave history." });
  }
};

export const handlePendingForManager = async (req, res) => {
  try {
    const requests = await pendingForManager(req.employee._id);
    return res.status(200).json({ leaveRequests: requests });
  } catch (error) {
    console.error("Pending leave requests error:", error);
    return res.status(500).json({ message: "Could not load pending leave requests." });
  }
};

export const handleReviewLeave = async (req, res) => {
  try {
    const doc = await reviewRequest(req.params.id, req.employee, req.body || {});
    return res.status(200).json({ leaveRequest: doc });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    console.error("Review leave error:", error);
    return res.status(500).json({ message: "Could not review leave request." });
  }
};