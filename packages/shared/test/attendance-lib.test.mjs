import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ATTENDANCE_TIMEZONE,
  HALF_DAY_CHECKIN_MINUTES,
  HALF_DAY_CHECKOUT_MINUTES,
  LATE_AFTER_MINUTES,
  LATE_NIGHT_CHECKIN_MINUTES,
  SHIFT_START_MINUTES,
  computeDayStatus,
  kolkataDateKey,
  kolkataDayStart,
  kolkataMinutesOfDay,
  kolkataNextDayStart,
  liveStatusFor,
  minutesBetween,
} from '../dist/index.js'

const at = (iso) => new Date(iso).getTime()

test('Kolkata time-of-day and day boundaries are timezone-independent', () => {
  assert.equal(ATTENDANCE_TIMEZONE, 'Asia/Kolkata')

  assert.equal(kolkataMinutesOfDay(at('2026-09-17T04:00:00Z')), 570) // 09:30 IST
  assert.equal(kolkataMinutesOfDay(at('2026-09-17T18:00:00Z')), 23 * 60 + 30) // 23:30 IST
  assert.equal(kolkataMinutesOfDay(at('2026-09-17T18:30:00Z')), 0) // 00:00 IST next day

  assert.equal(kolkataDayStart(at('2026-09-17T04:00:00Z')), at('2026-09-16T18:30:00Z'))
  assert.equal(kolkataNextDayStart(at('2026-09-17T04:00:00Z')), at('2026-09-17T18:30:00Z'))

  assert.equal(kolkataDateKey(at('2026-09-16T18:30:00Z')), '2026-09-17')
  assert.equal(kolkataDateKey(at('2026-09-16T18:29:59Z')), '2026-09-16')
})

test('computeDayStatus follows the donor decision table', () => {
  const absent = computeDayStatus({
    hasCheckIn: false,
    checkInMin: null,
    checkOutMin: null,
    hasLeave: false,
  })
  assert.equal(absent, 'absent')

  assert.equal(
    computeDayStatus({
      hasCheckIn: false,
      checkInMin: null,
      checkOutMin: null,
      hasLeave: true,
    }),
    'leave',
  )

  assert.equal(
    computeDayStatus({
      hasCheckIn: true,
      checkInMin: SHIFT_START_MINUTES,
      checkOutMin: null,
      hasLeave: false,
    }),
    'present',
  )

  assert.equal(
    computeDayStatus({
      hasCheckIn: true,
      checkInMin: LATE_AFTER_MINUTES + 1,
      checkOutMin: null,
      hasLeave: false,
    }),
    'late',
  )

  assert.equal(
    computeDayStatus({
      hasCheckIn: true,
      checkInMin: HALF_DAY_CHECKIN_MINUTES,
      checkOutMin: null,
      hasLeave: false,
    }),
    'half_day',
  )

  assert.equal(
    computeDayStatus({
      hasCheckIn: true,
      checkInMin: SHIFT_START_MINUTES,
      checkOutMin: HALF_DAY_CHECKOUT_MINUTES - 1,
      hasLeave: false,
    }),
    'half_day',
  )

  assert.equal(
    computeDayStatus({
      hasCheckIn: true,
      checkInMin: LATE_NIGHT_CHECKIN_MINUTES,
      checkOutMin: null,
      hasLeave: false,
    }),
    'absent',
  )

  assert.equal(
    computeDayStatus({
      hasCheckIn: true,
      checkInMin: HALF_DAY_CHECKIN_MINUTES,
      checkOutMin: null,
      hasLeave: true,
    }),
    'leave',
  )
})

test('live status is an overlay and never persists on_break', () => {
  assert.equal(liveStatusFor({ isOpen: false, onBreak: false, checkInMin: 570 }), null)
  assert.equal(liveStatusFor({ isOpen: true, onBreak: true, checkInMin: 570 }), 'on_break')
  assert.equal(liveStatusFor({ isOpen: true, onBreak: false, checkInMin: 570 }), 'present')
  assert.equal(liveStatusFor({ isOpen: true, onBreak: false, checkInMin: 590 }), 'late')
})

test('minutesBetween measures positive deltas only', () => {
  const a = new Date('2026-09-17T09:00:00Z')
  const b = new Date('2026-09-17T09:32:00Z')

  assert.equal(minutesBetween(a, b), 32)
  assert.equal(minutesBetween(b, a), 0)
  assert.equal(minutesBetween(null, b), 0)
  assert.equal(minutesBetween(a, undefined), 0)
})
