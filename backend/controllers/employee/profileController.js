import Employee from "../../models/employee/Employee.js";
import { sanitizeEmployee } from "../../services/employee/auth.service.js";
import { logActivity } from "../../services/employee/activity.service.js";
import { badRequest } from "../../validators/employee/util.validator.js";
import { optionalProfileFields } from "../../validators/employee/employee.validator.js";

// The reporting manager is stored as an id; the profile screens need the name.
const loadMe = (id) =>
  Employee.findById(id)
    .select("-password")
    .populate("manager", "firstName lastName employeeCode");

export const handleGetMe = async (req, res) => {
  try {
    const employee = await loadMe(req.employee._id);
    if (!employee) return res.status(404).json({ message: "Employee not found." });
    return res.status(200).json({ employee: sanitizeEmployee(employee) });
  } catch (error) {
    console.error("Get own profile error:", error);
    return res.status(500).json({ message: "Could not load profile." });
  }
};

const PROFILE_FIELDS = {
  phone: "phone",
  // department and designation are deliberately absent: they are HR/admin-owned
  // and are only changed through the admin employee routes, so a self-service
  // save cannot reassign someone to another department or job title.
  dateOfBirth: "personal.dateOfBirth",
  gender: "personal.gender",
  address: "profile.address",
  emergencyContact: "personal.emergencyContact",
  bio: "profile.bio",
  imageUrl: "profile.imageUrl",
  skills: "profile.skills",
  dob: "profile.dob",
  endDate: "job.endDate",
};

const destPaths = Object.values(PROFILE_FIELDS);

const sameValue = (a, b) => {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  const aArr = Array.isArray(a) ? a : null;
  const bArr = Array.isArray(b) ? b : null;
  if (aArr || bArr) {
    if (!aArr || !bArr || aArr.length !== bArr.length) return false;
    return aArr.every((v, i) => String(v) === String(bArr[i]));
  }
  return a === b;
};

export const handleUpdateMe = async (req, res) => {
  try {
    const body = req.body || {};
    const errors = [];
    // dob / endDate / address are validated up front so a bad value is a 400
    // rather than a silent clear; an empty string still means "clear".
    const parsed = optionalProfileFields(body, req.employee.job?.joinDate, errors);
    if (errors.length) throw badRequest("Invalid profile payload.", errors);

    const before = destPaths.map((p) => req.employee.get(p));
    for (const [src, dest] of Object.entries(PROFILE_FIELDS)) {
      if (body[src] === undefined) continue;
      if (src === "dob" || src === "endDate") {
        // Dates are stored as Date or null (cleared), never as strings.
        req.employee.set(dest, parsed[src]);
      } else if (src === "address") {
        req.employee.set(dest, parsed.address);
      } else {
        req.employee.set(dest, typeof body[src] === "string" ? body[src].trim() : body[src]);
      }
    }
    // Employees cannot change their own reporting manager.
    if ("manager" in body && String(body.manager) === "self") {
      req.employee.set("manager", req.employee.manager);
    }
    const changed = destPaths.some((p, i) => !sameValue(req.employee.get(p), before[i]));
    await req.employee.save();
    if (changed) {
      await logActivity(req.employee._id, "profile_updated");
    }
    const updated = await loadMe(req.employee._id);
    return res.status(200).json({ employee: sanitizeEmployee(updated) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, errors: error.errors });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    console.error("Update own profile error:", error);
    return res.status(500).json({ message: "Could not update profile." });
  }
};