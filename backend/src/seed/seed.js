import mongoose from 'mongoose'

import { emailSchema, passwordSchema } from '@hrms/shared'

import { env } from '../config/env.js'
import { connectDatabase, disconnectDatabase } from '../config/database.js'
import Employee from '../modules/employees/models/employee.model.js'
import Task from '../modules/tasks/models/task.model.js'
import { ensureOrganization } from '../modules/organizations/services/organization.service.js'
import { generateTaskId } from '../modules/tasks/services/task.service.js'

function requireAdminCredentials() {
  const { email, password, name } = env.admin
  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set before seeding. Admin accounts are seed-only.',
    )
  }

  if (!emailSchema.safeParse(email).success) {
    throw new Error('ADMIN_EMAIL is not a valid email address.')
  }

  const result = passwordSchema.safeParse(password)
  if (!result.success) {
    throw new Error(
      `ADMIN_PASSWORD does not meet the password policy: ${result.error.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    )
  }

  const [firstName, ...rest] = String(name || 'Administrator').trim().split(/\s+/)
  return {
    email,
    password,
    firstName: firstName || 'Administrator',
    lastName: rest.join(' ') || 'Account',
  }
}

async function seedAdmin(organizationId) {
  const credentials = requireAdminCredentials()

  const existing = await Employee.findOne({
    organization: organizationId,
    email: credentials.email,
  })

  if (existing) {
    let changed = false
    if (existing.role !== 'admin') {
      existing.role = 'admin'
      changed = true
    }
    if (existing.job?.isActive !== true) {
      existing.job.isActive = true
      existing.job.status = 'active'
      changed = true
    }
    if (changed) await existing.save()
    console.log(`Admin already exists: ${credentials.email}`)
    return existing
  }

  const admin = await Employee.create({
    organization: organizationId,
    email: credentials.email,
    password: credentials.password,
    role: 'admin',
    firstName: credentials.firstName,
    lastName: credentials.lastName,
    designation: 'Administrator',
    job: { status: 'active', isActive: true, joinDate: new Date() },
  })

  console.log(`Created admin: ${credentials.email} (${admin.employeeCode})`)
  return admin
}

async function seedDemo(organizationId, admin) {
  const demoPassword = process.env.DEMO_PASSWORD || 'Demo@12345'
  if (!passwordSchema.safeParse(demoPassword).success) {
    throw new Error('DEMO_PASSWORD does not meet the password policy.')
  }

  const managerEmail = 'manager@example.com'
  let manager = await Employee.findOne({ organization: organizationId, email: managerEmail })
  if (!manager) {
    manager = await Employee.create({
      organization: organizationId,
      email: managerEmail,
      password: demoPassword,
      role: 'manager',
      firstName: 'Maya',
      lastName: 'Manager',
      department: 'Engineering',
      designation: 'Engineering Manager',
      job: { status: 'active', isActive: true, joinDate: new Date() },
    })
    console.log(`Created demo manager: ${managerEmail}`)
  }

  const employeeEmail = 'employee@example.com'
  let employee = await Employee.findOne({ organization: organizationId, email: employeeEmail })
  if (!employee) {
    employee = await Employee.create({
      organization: organizationId,
      email: employeeEmail,
      password: demoPassword,
      role: 'employee',
      firstName: 'Evan',
      lastName: 'Employee',
      department: 'Engineering',
      designation: 'Software Engineer',
      manager: manager._id,
      job: { status: 'active', isActive: true, joinDate: new Date() },
    })
    console.log(`Created demo employee: ${employeeEmail}`)
  }

  const taskExists = await Task.exists({ organization: organizationId, assignedTo: employee._id })
  if (!taskExists) {
    await Task.create({
      organization: organizationId,
      taskId: await generateTaskId(organizationId),
      title: 'Complete onboarding checklist',
      description: 'Finish the onboarding checklist and raise any questions as queries.',
      assignedTo: employee._id,
      assignedBy: manager._id,
      dueDate: new Date(Date.now() + 7 * 86_400_000),
      priority: 'Medium',
      status: 'Not Started',
    })
    console.log('Created demo task')
  }

  console.log(`Demo password for seeded staff: ${demoPassword}`)
  return { manager, employee, admin }
}

async function main() {
  if (!env.mongodbUri) throw new Error('MONGODB_URI is required to seed the database.')

  await connectDatabase()
  const organization = await ensureOrganization()
  const admin = await seedAdmin(organization._id)

  if (process.env.SEED_DEMO === 'true') {
    await seedDemo(organization._id, admin)
  }
}

main()
  .then(async () => {
    console.log('Seed complete.')
    await disconnectDatabase()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('Seed failed:', error.message)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
