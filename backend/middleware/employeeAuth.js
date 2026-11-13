import jwt from "jsonwebtoken";
import Admin from "../models/employee/Admin.js";
import Employee from "../models/employee/Employee.js";

// Baseline HRMS auth: one employee realm plus the employee-admin realm. Both
// sign with JWT_SECRET and are distinguished by the token payload.
//
// The donor file also accepted the website platform token ({ userId } or
// { role: "admin" }); that realm has no meaning in this HRMS-only repository
// and depended on the website User model, so it is intentionally not part of
// the baseline. Re-introduce it in the integration phase if single sign-on is
// required.
export function resolveAdminIdentity(decoded) {
  if (!decoded || typeof decoded !== "object") return null;

  if (decoded.entity === "admin" && decoded.adminId) {
    return { source: "employee_admin", id: String(decoded.adminId) };
  }

  return null;
}

function getToken(req) {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    const err = new Error("Access denied. No token provided.");
    err.statusCode = 401;
    throw err;
  }
  return token;
}

function verifyEntity(token, entity) {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    const err = new Error("Invalid token.");
    err.statusCode = 401;
    throw err;
  }
  if (decoded.entity !== entity) {
    const err = new Error("Invalid token.");
    err.statusCode = 401;
    throw err;
  }
  return decoded;
}

export const authenticateAdmin = async (req, res, next) => {
  try {
    const decoded = jwt.verify(getToken(req), process.env.JWT_SECRET);
    const identity = resolveAdminIdentity(decoded);

    if (!identity) {
      return res.status(401).json({ message: "Invalid token." });
    }

    const admin = await Admin.findById(identity.id).select("-password");
    if (!admin || !admin.isActive || !admin.isSuperAdmin) {
      return res.status(401).json({ message: "Invalid token." });
    }

    req.admin = admin;
    req.adminSource = identity.source;
    return next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message || "Invalid token." });
  }
};

export const authenticateEmployee = async (req, res, next) => {
  try {
    const decoded = verifyEntity(getToken(req), "employee");
    const employee = await Employee.findById(decoded.employeeId).select("-password");
    if (!employee || !employee.job?.isActive) {
      return res.status(401).json({ message: "Invalid token." });
    }
    req.employee = employee;
    next();
  } catch (error) {
    return res.status(error.statusCode || 401).json({ message: error.message || "Invalid token." });
  }
};

export const authorizeEmployee = (roles = []) => {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({ message: "Not authenticated." });
    }
    if (roles.length > 0 && !roles.includes(req.employee.role)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};
