import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.JWT_SECRET = "hrms-api-tests-use-a-long-random-secret";

const backendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedScript = path.join(backendDirectory, "seed", "seedEmployees.mjs");
const app = express();
app.use(express.json());

const [{ default: Admin }, { default: Employee }, { default: employeeRoutes }, { signAdminToken }] =
  await Promise.all([
    import("../models/employee/Admin.js"),
    import("../models/employee/Employee.js"),
    import("../routes/employeeRoutes.js"),
    import("../services/employee/auth.service.js"),
  ]);
app.use("/api/employee", employeeRoutes);

let mongo;
let manager;
let employee;
let adminToken;
let managerToken;
let employeeToken;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

beforeEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
  await Admin.create({
    name: "System Admin",
    email: "system.admin@example.test",
    password: "SystemAdmin@123",
    isSuperAdmin: true,
  });
  manager = await Employee.create({
    email: "manager@example.test",
    password: "Manager@123",
    role: "manager",
    firstName: "Morgan",
    lastName: "Manager",
  });
  employee = await Employee.create({
    email: "employee@example.test",
    password: "Employee@123",
    role: "employee",
    firstName: "Evan",
    lastName: "Employee",
    manager: manager._id,
  });

  const [adminLogin, managerLogin, employeeLogin] = await Promise.all([
    request(app).post("/api/employee/auth/admin-login").send({
      email: "system.admin@example.test",
      password: "SystemAdmin@123",
    }),
    request(app).post("/api/employee/auth/login").send({
      email: "manager@example.test",
      password: "Manager@123",
    }),
    request(app).post("/api/employee/auth/login").send({
      email: "employee@example.test",
      password: "Employee@123",
    }),
  ]);
  assert.equal(adminLogin.status, 200);
  assert.equal(managerLogin.status, 200);
  assert.equal(employeeLogin.status, 200);
  adminToken = adminLogin.body.token;
  managerToken = managerLogin.body.token;
  employeeToken = employeeLogin.body.token;
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test("System Admin creates employee and manager accounts with validated active managers", async () => {
  const managerResponse = await request(app)
    .post("/api/employee/admin/employees")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      email: "new.manager@example.test",
      password: "NewManager@123",
      firstName: "New",
      lastName: "Manager",
      role: "manager",
    });

  assert.equal(managerResponse.status, 201);
  assert.equal(managerResponse.body.employee.role, "manager");
  assert.equal(managerResponse.body.employee.manager, null);
  const createdManagerLogin = await request(app)
    .post("/api/employee/auth/login")
    .send({ email: "new.manager@example.test", password: "NewManager@123" });
  assert.equal(createdManagerLogin.status, 200);
  assert.equal(createdManagerLogin.body.isManager, true);

  const employeeResponse = await request(app)
    .post("/api/employee/admin/employees")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      email: "new.employee@example.test",
      password: "NewEmployee@123",
      firstName: "New",
      lastName: "Employee",
      role: "employee",
      manager: String(manager._id),
    });

  assert.equal(employeeResponse.status, 201);
  assert.equal(employeeResponse.body.employee.role, "employee");
  assert.equal(String(employeeResponse.body.employee.manager._id), String(manager._id));

  const persisted = await Employee.findById(employeeResponse.body.employee._id).select("+password");
  assert.notEqual(persisted.password, "NewEmployee@123");
  assert.equal(await persisted.comparePassword("NewEmployee@123"), true);
  const createdEmployeeLogin = await request(app)
    .post("/api/employee/auth/login")
    .send({ email: "new.employee@example.test", password: "NewEmployee@123" });
  assert.equal(createdEmployeeLogin.status, 200);
  assert.equal(createdEmployeeLogin.body.role, "employee");

  const inactiveManager = await Employee.create({
    email: "inactive.manager@example.test",
    password: "InactiveManager@123",
    role: "manager",
    firstName: "Inactive",
    lastName: "Manager",
    job: { isActive: false, status: "inactive" },
  });
  const invalidAssignment = await request(app)
    .post("/api/employee/admin/employees")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      email: "invalid.assignment@example.test",
      password: "InvalidAssignment@123",
      firstName: "Invalid",
      lastName: "Assignment",
      manager: String(inactiveManager._id),
    });
  assert.equal(invalidAssignment.status, 400);

  const secondManager = await Employee.create({
    email: "second.manager@example.test",
    password: "SecondManager@123",
    role: "manager",
    firstName: "Second",
    lastName: "Manager",
  });
  const managerAssignment = await request(app)
    .put(`/api/employee/admin/employees/${manager._id}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ manager: String(secondManager._id) });
  assert.equal(managerAssignment.status, 400);
});

test("Managers cannot create accounts and employees cannot self-promote", async () => {
  const payload = {
    email: "manager.created@example.test",
    password: "ManagerCreated@123",
    firstName: "Manager",
    lastName: "Created",
  };
  const managerOnAdminRoute = await request(app)
    .post("/api/employee/admin/employees")
    .set("Authorization", `Bearer ${managerToken}`)
    .send(payload);
  assert.equal(managerOnAdminRoute.status, 401);

  const managerOnTeamCreateRoute = await request(app)
    .post("/api/employee/team")
    .set("Authorization", `Bearer ${managerToken}`)
    .send(payload);
  assert.equal(managerOnTeamCreateRoute.status, 404);

  const publicRegistration = await request(app)
    .post("/api/employee/auth/register")
    .send(payload);
  assert.equal(publicRegistration.status, 404);
  const adminRegistration = await request(app)
    .post("/api/employee/auth/admin-register")
    .send(payload);
  assert.equal(adminRegistration.status, 404);

  const selfPromotion = await request(app)
    .put("/api/employee/me")
    .set("Authorization", `Bearer ${employeeToken}`)
    .send({ role: "manager" });
  assert.equal(selfPromotion.status, 200);
  assert.equal(String(selfPromotion.body.employee._id), String(employee._id));
  assert.equal(selfPromotion.body.employee.role, "employee");

  const nonSystemAdmin = await Admin.create({
    name: "Non System Admin",
    email: "non-system-admin@example.test",
    password: "NonSystemAdmin@123",
  });
  const nonSystemAdminLogin = await request(app)
    .post("/api/employee/auth/admin-login")
    .send({ email: nonSystemAdmin.email, password: "NonSystemAdmin@123" });
  assert.equal(nonSystemAdminLogin.status, 401);

  const nonSystemAdminAccess = await request(app)
    .get("/api/employee/admin/stats")
    .set("Authorization", `Bearer ${signAdminToken(nonSystemAdmin)}`);
  assert.equal(nonSystemAdminAccess.status, 401);
});

test("Admin deactivation blocks login and existing tokens; reactivation restores login", async () => {
  const deactivated = await request(app)
    .delete(`/api/employee/admin/employees/${employee._id}`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(deactivated.status, 200);

  const blockedLogin = await request(app)
    .post("/api/employee/auth/login")
    .send({ email: "employee@example.test", password: "Employee@123" });
  assert.equal(blockedLogin.status, 401);

  const blockedToken = await request(app)
    .get("/api/employee/me")
    .set("Authorization", `Bearer ${employeeToken}`);
  assert.equal(blockedToken.status, 401);

  const reactivated = await request(app)
    .patch(`/api/employee/admin/employees/${employee._id}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ isActive: true });
  assert.equal(reactivated.status, 200);
  assert.equal(reactivated.body.employee.job.isActive, true);

  const restoredLogin = await request(app)
    .post("/api/employee/auth/login")
    .send({ email: "employee@example.test", password: "Employee@123" });
  assert.equal(restoredLogin.status, 200);
});

test("seed requires explicit credentials and creates demo accounts only by opt-in", async () => {
  const runSeed = (extraEnv = {}) =>
    spawnSync(process.execPath, [seedScript], {
      cwd: backendDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        MONGODB_URI: mongo.getUri(),
        MONGO_URI: "",
        EMPLOYEE_ADMIN_EMAIL: "seed.admin@example.test",
        EMPLOYEE_ADMIN_PASSWORD: "SeedAdmin@123",
        SEED_DEMO: "false",
        EMPLOYEE_DEMO_PASSWORD: "",
        ...extraEnv,
      },
    });

  const missingCredentials = spawnSync(process.execPath, [seedScript], {
    cwd: backendDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      MONGODB_URI: mongo.getUri(),
      MONGO_URI: "",
      EMPLOYEE_ADMIN_EMAIL: "",
      EMPLOYEE_ADMIN_PASSWORD: "",
      ADMIN_EMAIL: "",
      ADMIN_PASSWORD: "",
    },
  });
  assert.equal(missingCredentials.status, 1);
  assert.match(missingCredentials.stderr, /EMPLOYEE_ADMIN_EMAIL and EMPLOYEE_ADMIN_PASSWORD are required/);

  const adminOnly = runSeed();
  assert.equal(adminOnly.status, 0, adminOnly.stderr);
  assert.equal(await Admin.countDocuments({}), 2);
  assert.equal(await Employee.countDocuments({}), 2);
  const seededAdmin = await Admin.findOne({ email: "seed.admin@example.test" }).select("+password");
  assert.equal(seededAdmin.isSuperAdmin, true);
  assert.notEqual(seededAdmin.password, "SeedAdmin@123");
  assert.equal(await seededAdmin.comparePassword("SeedAdmin@123"), true);
  assert.equal(await Employee.countDocuments({ email: { $in: ["manager@test.com", "employee@test.com"] } }), 0);

  const withDemo = runSeed({
    SEED_DEMO: "true",
    EMPLOYEE_DEMO_PASSWORD: "DemoStaff@123",
  });
  assert.equal(withDemo.status, 0, withDemo.stderr);
  assert.equal(await Employee.countDocuments({ email: { $in: ["manager@test.com", "employee@test.com"] } }), 2);

  const repeatedSeed = runSeed({
    SEED_DEMO: "true",
    EMPLOYEE_DEMO_PASSWORD: "DemoStaff@123",
  });
  assert.equal(repeatedSeed.status, 0, repeatedSeed.stderr);
  assert.equal(await Employee.countDocuments({ email: { $in: ["manager@test.com", "employee@test.com"] } }), 2);
  const demoManager = await Employee.findOne({ email: "manager@test.com" }).select("+password");
  assert.notEqual(demoManager.password, "DemoStaff@123");
  assert.equal(await demoManager.comparePassword("DemoStaff@123"), true);
});
