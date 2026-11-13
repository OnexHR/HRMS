import Admin from "../../models/employee/Admin.js";
import Employee from "../../models/employee/Employee.js";
import {
  employeeResponse,
  sanitizeAdmin,
  signAdminToken,
  signEmployeeToken,
} from "../../services/employee/auth.service.js";

const loginAttempts = new Map();

function throttle(email) {
  const key = String(email || "").toLowerCase();
  if (!key) return null;
  const now = Date.now();
  const window = 15 * 60 * 1000;
  const record = loginAttempts.get(key);
  if (!record) return null;
  if (now - record.last > window) {
    loginAttempts.delete(key);
    return null;
  }
  if (record.count >= 5) {
    return { retryAfter: Math.ceil((record.last + window - now) / 1000) };
  }
  return null;
}

function recordAttempt(email, success) {
  const key = String(email || "").toLowerCase();
  if (!key) return;
  const now = Date.now();
  const record = loginAttempts.get(key) || { count: 0, last: now };
  if (success) record.count = 0;
  else record.count += 1;
  record.last = now;
  loginAttempts.set(key, record);
}

export const handleAdminLogin = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const limited = throttle(email);
    if (limited) {
      return res.status(429).json({ message: `Too many attempts. Retry in ${limited.retryAfter}s.` });
    }

    const admin = await Admin.findOne({ email }).select("+password");
    if (
      !admin ||
      !admin.isActive ||
      !admin.isSuperAdmin ||
      !(await admin.comparePassword(password))
    ) {
      recordAttempt(email, false);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    recordAttempt(email, true);
    return res.status(200).json({
      token: signAdminToken(admin),
      admin: sanitizeAdmin(admin),
    });
  } catch (error) {
    console.error("Employee admin login error:", error);
    return res.status(500).json({ message: "Login failed." });
  }
};

export const handleLogin = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    const limited = throttle(email);
    if (limited) {
      return res.status(429).json({ message: `Too many attempts. Retry in ${limited.retryAfter}s.` });
    }

    const employee = await Employee.findOne({ email }).select("+password");
    if (!employee || !employee.job?.isActive || !(await employee.comparePassword(password))) {
      recordAttempt(email, false);
      return res.status(401).json({ message: "Invalid email or password." });
    }

    recordAttempt(email, true);
    return res.status(200).json(employeeResponse(employee, signEmployeeToken(employee)));
  } catch (error) {
    console.error("Employee login error:", error);
    return res.status(500).json({ message: "Login failed." });
  }
};

export const handleMe = async (req, res) => {
  try {
    if (req.admin) {
      return res.status(200).json({ entity: "admin", admin: sanitizeAdmin(req.admin) });
    }
    return res.status(200).json({ entity: "employee", ...employeeResponse(req.employee, null) });
  } catch (error) {
    console.error("Employee me error:", error);
    return res.status(500).json({ message: "Could not load profile." });
  }
};

export const handleChangePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    const populated =
      req.employee
        ? await Employee.findById(req.employee._id).select("+password")
        : await Admin.findById(req.admin._id).select("+password");

    if (!populated) return res.status(404).json({ message: "Account not found." });
    if (!(await populated.comparePassword(currentPassword || ""))) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    populated.password = newPassword;
    await populated.save();
    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("Employee change password error:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Could not update password." });
  }
};