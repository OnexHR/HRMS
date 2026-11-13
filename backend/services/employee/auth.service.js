import jwt from "jsonwebtoken";

const JWT_EXPIRES = process.env.EMPLOYEE_JWT_EXPIRES_IN || "7d";

export function signAdminToken(admin) {
  return jwt.sign({ entity: "admin", adminId: String(admin._id) }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES,
  });
}

export function signEmployeeToken(employee) {
  return jwt.sign(
    { entity: "employee", employeeId: String(employee._id) },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

export function sanitizeEmployee(employee) {
  if (!employee) return null;
  const doc = employee.toObject ? employee.toObject() : employee;
  const { password, ...rest } = doc;
  return rest;
}

export function sanitizeAdmin(admin) {
  if (!admin) return null;
  const doc = admin.toObject ? admin.toObject() : admin;
  const { password, ...rest } = doc;
  return rest;
}

export function employeeResponse(employee, token) {
  return {
    token,
    isManager: employee.role === "manager",
    role: employee.role,
    employee: sanitizeEmployee(employee),
  };
}