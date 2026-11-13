import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assignableRoleSchema,
  createEmployeeSchema,
  updateEmployeeSchema,
  updateEmployeeStatusSchema,
  updateProfileSchema,
} from '../dist/index.js'

const base = {
  email: '  Ada@Example.COM ',
  password: 'Strong#1pass',
  firstName: 'Ada',
  lastName: 'Lovelace',
}

test('create schema applies documented defaults and normalizes email', () => {
  const parsed = createEmployeeSchema.parse(base)

  assert.deepEqual(parsed, {
    email: 'ada@example.com',
    password: 'Strong#1pass',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: 'employee',
    phone: '',
    department: '',
    designation: '',
  })
})

test('C1: update schema does not leak create defaults into a PATCH', () => {
  assert.deepEqual(updateEmployeeSchema.parse({ firstName: 'Grace' }), {
    firstName: 'Grace',
  })
  assert.deepEqual(updateEmployeeSchema.parse({}), {})

  const parsed = updateEmployeeSchema.parse({ firstName: 'Grace' })
  for (const key of ['role', 'phone', 'department', 'designation']) {
    assert.equal(key in parsed, false, key)
  }
})

test('employee payloads are strict about unknown keys', () => {
  assert.throws(
    () => updateEmployeeSchema.parse({ organizationId: '65f000000000000000000000' }),
    /Unrecognized key/,
  )
  assert.throws(() => createEmployeeSchema.parse({ ...base, isAdmin: true }), /Unrecognized key/)
  assert.throws(() => updateProfileSchema.parse({ role: 'admin' }), /Unrecognized key/)
  assert.throws(
    () => updateEmployeeStatusSchema.parse({ isActive: true, role: 'admin' }),
    /Unrecognized key/,
  )
})

test('role ceiling is enforced by the create/update role enum', () => {
  assert.equal(assignableRoleSchema.safeParse('admin').success, false)
  assert.equal(assignableRoleSchema.safeParse('manager').success, true)
  assert.equal(assignableRoleSchema.safeParse('employee').success, true)

  assert.equal(createEmployeeSchema.safeParse({ ...base, role: 'admin' }).success, false)
  assert.equal(createEmployeeSchema.safeParse({ ...base, role: 'manager' }).success, true)
  assert.equal(updateEmployeeSchema.safeParse({ role: 'admin' }).success, false)
  assert.equal(updateEmployeeSchema.safeParse({ role: 'manager' }).success, true)
})

test('department is a string, not an organization id', () => {
  assert.equal(createEmployeeSchema.safeParse({ ...base, department: 'Engineering' }).success, true)
  assert.equal(
    createEmployeeSchema.safeParse({
      ...base,
      departmentId: '65f000000000000000000000',
    }).success,
    false,
  )
  assert.equal(updateEmployeeSchema.safeParse({ department: 'Engineering' }).success, true)
})

test('employment status and manager fields remain editable', () => {
  const parsed = updateEmployeeSchema.parse({
    employmentStatus: 'on_leave',
    isActive: false,
    managerId: '65f000000000000000000000',
    joinDate: '2026-01-02',
  })

  assert.equal(parsed.employmentStatus, 'on_leave')
  assert.equal(parsed.isActive, false)
  assert.equal(parsed.managerId, '65f000000000000000000000')
  assert.equal(parsed.joinDate, '2026-01-02')
})
