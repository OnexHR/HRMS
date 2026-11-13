import Employee from "../../models/employee/Employee.js";
import Attendance from "../../models/employee/Attendance.js";
import LeaveRequest from "../../models/employee/LeaveRequest.js";
import Task from "../../models/employee/Task.js";
import {
  validateEmployeeCreate,
  validateEmployeeUpdate,
} from "../../validators/employee/employee.validator.js";
import { badRequest, notFound, conflict, isObjectId } from "../../validators/employee/util.validator.js";
import { sanitizeEmployee } from "../../services/employee/auth.service.js";
import { logActivity } from "../../services/employee/activity.service.js";
import { assignTask } from "../../services/employee/task.service.js";
import { availabilityMapFor } from "./meetingController.js";

const MANAGER_PROJECTION =
  "firstName lastName employeeCode email phone department designation role manager job.isActive profile";

const MANAGER_FIELDS = "firstName lastName employeeCode designation";

// The manager is stored as an id; admin screens show the name next to the
// employee, so every single-record response has to populate it.
const loadForAdmin = (id) =>
  Employee.findById(id).select("-password").populate("manager", MANAGER_FIELDS);

export const handleCreateEmployee = async (req, res) => {
  try {
    if (!req.admin?.isSuperAdmin) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const payload = validateEmployeeCreate(req.body || {});

    if (payload.manager) {
      const manager = await Employee.findOne({
        _id: payload.manager,
        role: "manager",
        "job.isActive": true,
      }).lean();
      if (!manager) {
        return res.status(400).json({ message: "Assigned manager must be an existing manager." });
      }
    }
    if (payload.role === "manager") payload.manager = null;

    const employee = await Employee.create(payload);
    await logActivity(employee._id, "employee_created", { by: String(req.admin._id) });

    return res.status(201).json({ employee: sanitizeEmployee(await loadForAdmin(employee._id)) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An employee with this email already exists." });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Create employee error:", error);
    return res.status(500).json({ message: "Could not create employee." });
  }
};

export const handleListEmployees = async (req, res) => {
  try {
    const { department, role, status, manager, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (status) filter["job.status"] = status;
    if (manager) filter.manager = manager;
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { email: rx },
        { employeeCode: rx },
        { department: rx },
      ];
    }
    if (req.query.isActive !== undefined) filter["job.isActive"] = req.query.isActive === "true";

    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .select(MANAGER_PROJECTION)
        .populate("manager", "firstName lastName employeeCode")
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Employee.countDocuments(filter),
    ]);

    return res.status(200).json({ employees, total, page: p, limit: l, totalPages: Math.ceil(total / l) });
  } catch (error) {
    console.error("List employees error:", error);
    return res.status(500).json({ message: "Could not list employees." });
  }
};

export const handleListAvailableEmployees = async (req, res) => {
  try {
    const managerId = req.employee._id;
    const { search } = req.query;
    const filter = { "job.isActive": true };
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { firstName: rx },
        { lastName: rx },
        { email: rx },
        { employeeCode: rx },
        { department: rx },
      ];
    }

    const employees = await Employee.find(filter)
      .select("firstName lastName employeeCode email department designation role manager job.joinDate")
      .sort({ firstName: 1 })
      .lean();

    const ids = employees.map((e) => String(e._id));
    const availability = await availabilityMapFor(ids);

    // Managers pick from the whole company - employees and managers alike - so
    // everyone comes back and the ones already on the team are flagged.
    return res.status(200).json({
      employees: employees
        .filter((emp) => String(emp._id) !== String(managerId))
        .map((emp) => ({
          ...emp,
          inTeam: String(emp.manager) === String(managerId),
          availability: availability[String(emp._id)] ?? { status: "available", expectedEndAt: null },
        })),
    });
  } catch (error) {
    console.error("List available employees error:", error);
    return res.status(500).json({ message: "Could not load employees." });
  }
};

export const handleAddTeamMember = async (req, res) => {
  try {
    const { employeeId } = req.body || {};
    if (!isObjectId(employeeId)) throw badRequest("Pick an employee to add.");

    const employee = await Employee.findById(employeeId);
    if (!employee) throw notFound("Employee not found.");
    if (String(employee._id) === String(req.employee._id)) {
      throw badRequest("You cannot add yourself to your own team.");
    }
    if (String(employee.manager) === String(req.employee._id)) {
      throw conflict("This employee is already on your team.");
    }

    employee.manager = req.employee._id;
    await employee.save();
    await logActivity(employee._id, "employee_updated", { by: String(req.employee._id) });

    return res.status(200).json({
      member: {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeCode: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
        role: employee.role,
        job: { joinDate: employee.job?.joinDate ?? null },
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Add team member error:", error);
    return res.status(500).json({ message: "Could not add employee to your team." });
  }
};

export const handleRemoveTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) throw badRequest("Pick an employee to remove.");

    const employee = await Employee.findById(id);
    if (!employee) throw notFound("Employee not found.");
    if (String(employee.manager) !== String(req.employee._id)) {
      throw badRequest("This employee is not on your team.");
    }

    employee.manager = null;
    await employee.save();
    await logActivity(employee._id, "employee_updated", { removedFromTeam: String(req.employee._id) });

    return res.status(200).json({
      member: {
        _id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeCode: employee.employeeCode,
        department: employee.department,
        designation: employee.designation,
        role: employee.role,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Remove team member error:", error);
    return res.status(500).json({ message: "Could not remove employee from your team." });
  }
};

export const handleGetEmployee = async (req, res) => {
  try {
    const employee = await loadForAdmin(req.params.id);

    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const [taskCount, leaveCount, attendanceCount] = await Promise.all([
      Task.countDocuments({ assignedTo: employee._id, status: "Completed" }),
      LeaveRequest.countDocuments({ employee: employee._id }),
      Attendance.countDocuments({ employee: employee._id }),
    ]);

    return res.status(200).json({
      employee: sanitizeEmployee(employee),
      stats: {
        tasksCompleted: taskCount,
        totalLeaves: leaveCount,
        attendanceDays: attendanceCount,
        leaveBalance: employee.leaveBalances,
      },
    });
  } catch (error) {
    console.error("Get employee error:", error);
    return res.status(500).json({ message: "Could not load employee." });
  }
};

export const handleUpdateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) throw notFound("Employee not found.");

    const payload = validateEmployeeUpdate(req.body || {}, employee.job?.joinDate);

    if ((payload.role || employee.role) === "manager" && payload.manager) {
      return res.status(400).json({ message: "A manager cannot be assigned a reporting manager." });
    }
    if (payload.manager && String(payload.manager) === String(employee._id)) {
      return res.status(400).json({ message: "An employee cannot be their own manager." });
    }
    if (payload.manager) {
      const manager = await Employee.findOne({
        _id: payload.manager,
        role: "manager",
        "job.isActive": true,
      }).lean();
      if (!manager) {
        return res.status(400).json({ message: "Assigned manager must be an existing manager." });
      }
    }
    if (payload.role === "manager") payload.manager = null;

    const fields = {
      email: "email",
      password: "password",
      role: "role",
      firstName: "firstName",
      lastName: "lastName",
      phone: "phone",
      department: "department",
      designation: "designation",
      manager: "manager",
      joinDate: "job.joinDate",
      status: "job.status",
      isActive: "job.isActive",
      dateOfBirth: "personal.dateOfBirth",
      gender: "personal.gender",
      address: "personal.address",
      emergencyContact: "personal.emergencyContact",
      bio: "profile.bio",
      imageUrl: "profile.imageUrl",
      skills: "profile.skills",
      dob: "profile.dob",
      endDate: "job.endDate",
    };

    for (const [src, dest] of Object.entries(fields)) {
      if (payload[src] !== undefined) employee.set(dest, payload[src]);
    }

    await employee.save();
    await logActivity(employee._id, "employee_updated", { by: String(req.admin._id) });

    return res.status(200).json({ employee: sanitizeEmployee(await loadForAdmin(employee._id)) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An employee with this email already exists." });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Update employee error:", error);
    return res.status(500).json({ message: "Could not update employee." });
  }
};

export const handleDeleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    employee.job.isActive = false;
    employee.job.status = "inactive";
    await employee.save();

    const children = await Employee.updateMany(
      { manager: employee._id },
      { $set: { manager: null } },
    );

    await logActivity(employee._id, "employee_deleted", { by: String(req.admin._id) });

    return res.status(200).json({
      message: "Employee deactivated.",
      detachedReports: children.modifiedCount,
    });
  } catch (error) {
    console.error("Delete employee error:", error);
    return res.status(500).json({ message: "Could not delete employee." });
  }
};

export const handleUpdateEmployeeStatus = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });

    const isActive = typeof req.body?.isActive === "boolean" ? req.body.isActive : !employee.job.isActive;
    employee.job.isActive = isActive;
    employee.job.status = isActive ? "active" : "inactive";
    await employee.save();

    return res.status(200).json({ employee: sanitizeEmployee(await loadForAdmin(employee._id)) });
  } catch (error) {
    console.error("Update employee status error:", error);
    return res.status(500).json({ message: "Could not update employee status." });
  }
};

export const handleAdminStats = async (req, res) => {
  try {
    const [total, byRole, byDepartment, byStatus] = await Promise.all([
      Employee.countDocuments(),
      Employee.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]),
      Employee.aggregate([
        { $match: { department: { $ne: "" } } },
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Employee.aggregate([{ $group: { _id: "$job.status", count: { $sum: 1 } } }]),
    ]);

    const reduce = (rows) =>
      Object.fromEntries(rows.map((r) => [r._id || "other", r.count]));

    return res.status(200).json({
      total,
      byRole: reduce(byRole),
      byDepartment: byDepartment.map((r) => ({ department: r._id, count: r.count })),
      byStatus: reduce(byStatus),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ message: "Could not load stats." });
  }
};

export const handleAssignTask = async (req, res) => {
  try {
    const actor = req.admin ? { _id: String(req.admin._id), role: "admin" } : null;
    if (!actor) {
      return res.status(401).json({ message: "Admin authentication required." });
    }
    const task = await assignTask(actor, req.body || {});
    return res.status(201).json({ task });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Admin assign task error:", error);
    return res.status(500).json({ message: "Could not assign task." });
  }
};

export const handleListManagers = async (req, res) => {
  try {
    const managers = await Employee.find({ role: "manager", "job.isActive": true })
      .select("firstName lastName employeeCode department designation")
      .sort({ firstName: 1 })
      .lean();
    return res.status(200).json({ managers });
  } catch (error) {
    console.error("List managers error:", error);
    return res.status(500).json({ message: "Could not list managers." });
  }
};