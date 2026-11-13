import Employee from "../../models/employee/Employee.js";
import {
  employeeDashboard,
  managerDashboard,
} from "../../services/employee/dashboard.service.js";

export const handleEmployeeDashboard = async (req, res) => {
  try {
    const data = await employeeDashboard(req.employee._id, req.query.date || new Date());
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Employee dashboard error:", error);
    return res.status(500).json({ message: "Could not load dashboard." });
  }
};

export const handleManagerDashboard = async (req, res) => {
  try {
    const data = await managerDashboard(req.employee._id, req.query.date || new Date());
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Manager dashboard error:", error);
    return res.status(500).json({ message: "Could not load dashboard." });
  }
};

export const handleTeamMembers = async (req, res) => {
  try {
    const members = await Employee.find({ manager: req.employee._id, "job.isActive": true })
      .select("firstName lastName employeeCode department designation job.joinDate profile.imageUrl")
      .populate("manager", "firstName lastName employeeCode")
      .sort({ firstName: 1 })
      .lean();
    return res.status(200).json({ members });
  } catch (error) {
    console.error("Team members error:", error);
    return res.status(500).json({ message: "Could not load team members." });
  }
};

export const handleTeamMemberDetail = async (req, res) => {
  try {
    const member = await Employee.findOne({
      _id: req.params.id,
      manager: req.employee._id,
      "job.isActive": true,
    })
      .select("-password")
      .populate("manager", "firstName lastName employeeCode");

    if (!member) return res.status(404).json({ message: "Team member not found." });

    const [attendanceMonth, pendingLeaves] = await Promise.all([
      import("../../services/employee/attendance.service.js").then((m) =>
        m.monthlyAttendance(member._id, req.query.date || new Date()),
      ),
      import("../../models/employee/LeaveRequest.js").then(({ default: LeaveRequest }) =>
        LeaveRequest.find({ employee: member._id, status: "pending" })
          .sort({ fromDate: 1 })
          .lean(),
      ),
    ]);

    const memberJson = member.toObject();
    delete memberJson.password;
    return res.status(200).json({ member: memberJson, attendanceMonth, pendingLeaves });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Team member detail error:", error);
    return res.status(500).json({ message: "Could not load team member." });
  }
};