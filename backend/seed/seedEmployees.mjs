import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import Admin from "../models/employee/Admin.js";
import Employee from "../models/employee/Employee.js";

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?]).{8,}$/;

async function seedAdmin(email, password) {
  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.password = password;
    existing.name = existing.name || "System Admin";
    existing.isSuperAdmin = true;
    existing.isActive = true;
    await existing.save();
    console.log(`System Admin updated: ${email}`);
    return;
  }

  await Admin.create({
    name: "System Admin",
    email,
    password,
    isSuperAdmin: true,
  });
  console.log(`System Admin created: ${email}`);
}

async function seedDemo(password) {
  const managerEmail = (
    process.env.EMPLOYEE_DEMO_MANAGER_EMAIL || "manager@test.com"
  ).toLowerCase();
  const employeeEmail = (
    process.env.EMPLOYEE_DEMO_EMPLOYEE_EMAIL || "employee@test.com"
  ).toLowerCase();

  let manager = await Employee.findOne({ email: managerEmail });
  if (!manager) {
    manager = await Employee.create({
      email: managerEmail,
      password,
      role: "manager",
      firstName: "Akshay",
      lastName: "Kumar",
      department: "Management",
      designation: "Team Manager",
      job: { joinDate: new Date("2025-01-02"), status: "active", isActive: true },
    });
    console.log(`Demo manager created: ${managerEmail} (${manager.employeeCode})`);
  }

  const employee = await Employee.findOne({ email: employeeEmail });
  if (!employee) {
    await Employee.create({
      email: employeeEmail,
      password,
      role: "employee",
      firstName: "Rahul",
      lastName: "Sharma",
      department: "Development",
      designation: "Software Engineer",
      manager: manager._id,
      job: { joinDate: new Date("2025-06-01"), status: "active", isActive: true },
    });
    console.log(`Demo employee created: ${employeeEmail}`);
  }
}

async function main() {
  const adminEmail = String(process.env.EMPLOYEE_ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPassword = process.env.EMPLOYEE_ADMIN_PASSWORD || "";

  if (!MONGO_URI) throw new Error("MONGODB_URI (or MONGO_URI) is required.");
  if (!adminEmail || !adminPassword) {
    throw new Error("EMPLOYEE_ADMIN_EMAIL and EMPLOYEE_ADMIN_PASSWORD are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
    throw new Error("EMPLOYEE_ADMIN_EMAIL must be a valid email address.");
  }
  if (!PASSWORD_RE.test(adminPassword)) {
    throw new Error(
      "EMPLOYEE_ADMIN_PASSWORD must contain at least 8 characters, one uppercase, one lowercase, one number and one special character.",
    );
  }

  await mongoose.connect(MONGO_URI);
  try {
    await seedAdmin(adminEmail, adminPassword);
    if (process.env.SEED_DEMO === "true") {
      const demoPassword = process.env.EMPLOYEE_DEMO_PASSWORD || "";
      if (!PASSWORD_RE.test(demoPassword)) {
        throw new Error(
          "SEED_DEMO=true requires EMPLOYEE_DEMO_PASSWORD to meet the password policy.",
        );
      }
      await seedDemo(demoPassword);
    }
  } finally {
    await mongoose.disconnect();
  }
  console.log("Employee seed complete.");
}

main().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exitCode = 1;
});
