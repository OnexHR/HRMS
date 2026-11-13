import Employee from "../../models/employee/Employee.js";
import EmployeeQuery from "../../models/employee/EmployeeQuery.js";
import { raiseQuery, reviewQuery } from "../../services/employee/query.service.js";

export const handleRaiseQuery = async (req, res) => {
  try {
    const query = await raiseQuery(req.employee._id, req.body || {});
    return res.status(201).json({ query });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Raise query error:", error);
    return res.status(500).json({ message: "Could not raise query." });
  }
};

export const handleMyQueries = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { employee: req.employee._id };
    if (status) filter.status = status;
    const queries = await EmployeeQuery.find(filter)
      .populate("task", "taskId title")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ queries });
  } catch (error) {
    console.error("My queries error:", error);
    return res.status(500).json({ message: "Could not load queries." });
  }
};

export const handleTeamQueries = async (req, res) => {
  try {
    const { status } = req.query;
    const team = await Employee.find({ manager: req.employee._id, "job.isActive": true })
      .select("_id")
      .lean();
    const ids = team.map((member) => member._id);
    const filter = { employee: { $in: ids } };
    if (status) filter.status = status;

    const queries = await EmployeeQuery.find(filter)
      .populate("task", "taskId title")
      .populate("employee", "firstName lastName employeeCode department")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ queries });
  } catch (error) {
    console.error("Team queries error:", error);
    return res.status(500).json({ message: "Could not load team queries." });
  }
};

export const handleReviewQuery = async (req, res) => {
  try {
    const query = await reviewQuery(req.params.id, req.employee, req.body || {});
    return res.status(200).json({ query });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Review query error:", error);
    return res.status(500).json({ message: "Could not review query." });
  }
};

export const handleQueryStats = async (req, res) => {
  try {
    let baseFilter = { employee: req.employee._id };

    if (req.employee.role === "manager") {
      const team = await Employee.find({ manager: req.employee._id, "job.isActive": true }).select("_id").lean();
      const ids = team.map((member) => member._id);
      baseFilter = ids.length ? { employee: { $in: ids } } : { employee: { $in: [] } };
    }

    const [total, open, inReview, resolved, raisedAgain] = await Promise.all([
      EmployeeQuery.countDocuments(baseFilter),
      EmployeeQuery.countDocuments({ ...baseFilter, status: "open" }),
      EmployeeQuery.countDocuments({ ...baseFilter, status: "in_review" }),
      EmployeeQuery.countDocuments({ ...baseFilter, status: "resolved" }),
      EmployeeQuery.countDocuments({ ...baseFilter, status: "raised_again" }),
    ]);
    return res.status(200).json({ total, open, inReview, resolved, raisedAgain });
  } catch (error) {
    console.error("Query stats error:", error);
    return res.status(500).json({ message: "Could not load query stats." });
  }
};