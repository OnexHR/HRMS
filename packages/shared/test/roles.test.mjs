import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ROLES,
  ROLE_LABELS,
  ROLE_RANK,
  ROLE_PERMISSIONS,
  PERMISSIONS,
  DEFAULT_ROLE,
  canAssignRole,
  resolveReadScope,
  hasPermission,
  isRole,
  roleAtLeast,
} from '../dist/index.js'

test('Stage 1 exposes exactly the three approved roles', () => {
  assert.deepEqual(ROLES, ['admin', 'manager', 'employee'])
  assert.equal(DEFAULT_ROLE, 'employee')
  assert.deepEqual(Object.keys(ROLE_LABELS), ['admin', 'manager', 'employee'])
  assert.deepEqual(Object.keys(ROLE_RANK), ['admin', 'manager', 'employee'])

  for (const legacy of ['system_admin', 'org_admin', 'hr_manager']) {
    assert.equal(ROLES.includes(legacy), false)
    assert.equal(isRole(legacy), false)
  }
})

test('permission matrix is additive and H2-scoped', () => {
  assert.deepEqual(ROLE_PERMISSIONS.admin, PERMISSIONS)

  for (const permission of ROLE_PERMISSIONS.employee) {
    assert.ok(ROLE_PERMISSIONS.manager.includes(permission), permission)
  }
  for (const permission of ROLE_PERMISSIONS.manager) {
    assert.ok(ROLE_PERMISSIONS.admin.includes(permission), permission)
  }

  assert.equal(hasPermission('employee', 'employee:read:self'), true)
  assert.equal(hasPermission('employee', 'employee:read:team'), false)
  assert.equal(hasPermission('manager', 'employee:read:self'), true)
  assert.equal(hasPermission('manager', 'employee:read:team'), true)
  assert.equal(hasPermission('manager', 'employee:read:all'), false)
  assert.equal(hasPermission('admin', 'employee:read:all'), true)
  assert.equal(hasPermission('manager', 'employee:create'), false)
  assert.equal(hasPermission('admin', 'employee:create'), true)
  assert.equal(hasPermission('manager', 'settings:manage'), false)
  assert.equal(hasPermission('admin', 'settings:manage'), true)
})

test('enterprise and unscoped permissions are absent', () => {
  for (const permission of [
    'employee:read',
    'system:manage',
    'organization:read',
    'organization:update',
    'settings:read',
    'settings:update',
    'employee:delete',
    'attendance:read:org',
    'leave:review:org',
    'leave:adjust',
    'report:read:org',
  ]) {
    assert.equal(PERMISSIONS.includes(permission), false, permission)
  }
})

test('role ceiling: managers may only assign employee, nobody may self-assign', () => {
  assert.equal(canAssignRole('admin', 'admin'), true)
  assert.equal(canAssignRole('admin', 'manager'), true)
  assert.equal(canAssignRole('admin', 'employee'), true)
  assert.equal(canAssignRole('manager', 'employee'), true)
  assert.equal(canAssignRole('manager', 'manager'), false)
  assert.equal(canAssignRole('manager', 'admin'), false)
  assert.equal(canAssignRole('employee', 'employee'), false)
  assert.equal(canAssignRole('admin', 'admin', true), false)
  assert.equal(canAssignRole('admin', 'employee', true), false)
})

test('resolveReadScope matches the role ceiling', () => {
  assert.equal(resolveReadScope('admin'), 'all')
  assert.equal(resolveReadScope('manager'), 'team')
  assert.equal(resolveReadScope('employee'), 'self')
})

test('roleAtLeast follows the three-role rank', () => {
  assert.equal(roleAtLeast('admin', 'manager'), true)
  assert.equal(roleAtLeast('manager', 'admin'), false)
  assert.equal(roleAtLeast('employee', 'employee'), true)
})
