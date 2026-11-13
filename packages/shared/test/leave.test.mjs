import test from 'node:test'
import assert from 'node:assert/strict'

import {
  countLeaveDays,
  eachWorkingDate,
  isWorkingDay,
  createLeaveRequestSchema,
} from '../dist/index.js'

test('countLeaveDays skips weekends and handles working half days', () => {
  // 2026-09-17 is a Thursday; 2026-09-19/20 are the weekend.
  assert.equal(countLeaveDays('2026-09-17', '2026-09-18', 'full_day'), 2)
  assert.equal(countLeaveDays('2026-09-17', '2026-09-21', 'full_day'), 3) // Thu, Fri, Mon
  assert.equal(countLeaveDays('2026-09-17', '2026-09-17', 'first_half'), 0.5)
  assert.equal(countLeaveDays('2026-09-17', '2026-09-17', 'second_half'), 0.5)
})

test('M1: a half day on a non-working day counts as zero, never 0.5', () => {
  assert.equal(countLeaveDays('2026-09-19', '2026-09-19', 'first_half'), 0) // Saturday
  assert.equal(countLeaveDays('2026-09-20', '2026-09-20', 'second_half'), 0) // Sunday
  assert.equal(countLeaveDays('2026-09-19', '2026-09-20', 'full_day'), 0)
})

test('multi-date half days and invalid ranges count as zero', () => {
  assert.equal(countLeaveDays('2026-09-17', '2026-09-18', 'first_half'), 0)
  assert.equal(countLeaveDays('2026-09-20', '2026-09-17', 'full_day'), 0)
  assert.equal(countLeaveDays('2026-02-31', '2026-03-02', 'full_day'), 0)
})

test('countLeaveDays includes leap days and supports custom working weeks', () => {
  assert.equal(countLeaveDays('2028-02-28', '2028-03-01', 'full_day'), 3) // Mon, Tue, Wed
  assert.equal(countLeaveDays('2026-09-17', '2026-09-21', 'full_day', [1, 2, 3, 4]), 2)
})

test('working-day iteration is inclusive and timezone-independent', () => {
  assert.deepEqual(eachWorkingDate('2026-09-17', '2026-09-21'), [
    '2026-09-17',
    '2026-09-18',
    '2026-09-21',
  ])
  assert.equal(isWorkingDay('2026-09-17'), true)
  assert.equal(isWorkingDay('2026-09-19'), false)
  assert.equal(isWorkingDay('not-a-date'), false)
})

test('leave schema rejects zero-working-day and multi-date half-day requests', () => {
  const base = {
    leaveType: 'casual',
    dayType: 'first_half',
    fromDate: '2026-09-19',
    toDate: '2026-09-19',
  }

  assert.equal(createLeaveRequestSchema.safeParse(base).success, false) // weekend
  assert.equal(
    createLeaveRequestSchema.safeParse({
      ...base,
      fromDate: '2026-09-17',
      toDate: '2026-09-18',
    }).success,
    false,
  ) // multi-date half day
  assert.equal(
    createLeaveRequestSchema.safeParse({
      ...base,
      fromDate: '2026-09-17',
      toDate: '2026-09-17',
    }).success,
    true,
  )

  assert.equal(
    createLeaveRequestSchema.safeParse({
      leaveType: 'casual',
      dayType: 'full_day',
      fromDate: '2026-09-19',
      toDate: '2026-09-20',
    }).success,
    false,
  )
})
