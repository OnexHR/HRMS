import test from 'node:test'
import assert from 'node:assert/strict'

import * as shared from '../dist/index.js'

test('required Stage 1 runtime exports are present', () => {
  const required = [
    'ROLES',
    'ROLE_PERMISSIONS',
    'canAssignRole',
    'resolveReadScope',
    'API_ERROR_CODES',
    'API_ERROR_STATUS',
    'isApiErrorCode',
    'WORKING_WEEKDAYS',
    'DEFAULT_LEAVE_ALLOCATION',
    'countLeaveDays',
    'isWorkingDay',
    'eachWorkingDate',
    'utf8ByteLength',
    'normalizeMimeType',
    'normalizeFilename',
    'isAllowedMimeType',
    'isFilenameConsistentWithMime',
    'createFileUploadMetadataSchema',
    'kolkataMinutesOfDay',
    'kolkataDayStart',
    'kolkataNextDayStart',
    'kolkataDateKey',
    'computeDayStatus',
    'liveStatusFor',
    'minutesBetween',
    'createEmployeeSchema',
    'updateEmployeeSchema',
    'loginSchema',
    'changePasswordSchema',
  ]

  for (const name of required) {
    assert.ok(name in shared, `${name} must be exported`)
  }
})

test('deferred and enterprise runtime contracts are not exported', () => {
  const removed = [
    'ATTENDANCE_POLICY_DEFAULTS',
    'DEFAULT_WORKING_WEEKDAYS',
    'LEAVE_LEDGER_ENTRY_TYPES',
    'LEAVE_LEDGER_ENTRY_LABELS',
    'leaveBalanceAdjustmentSchema',
    'filePolicySchema',
    'allowedMimeTypeListSchema',
    'refreshTokenSchema',
  ]

  for (const name of removed) {
    assert.equal(name in shared, false, `${name} must not be exported`)
  }
})

test('Stage 1 defaults match the donor policy', () => {
  assert.deepEqual(shared.WORKING_WEEKDAYS, [1, 2, 3, 4, 5])
  assert.deepEqual(shared.DEFAULT_LEAVE_ALLOCATION, {
    casual: 12,
    sick: 10,
    earned: 15,
    unpaid: 0,
  })
  assert.equal(shared.DEFAULT_ROLE, 'employee')
  assert.deepEqual(shared.ASSIGNABLE_ROLES, ['manager', 'employee'])
})

test('no enterprise or unscoped permission strings leak through the barrel', () => {
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
    assert.equal(shared.PERMISSIONS.includes(permission), false, permission)
  }
})
