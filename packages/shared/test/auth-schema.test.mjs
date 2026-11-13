import test from 'node:test'
import assert from 'node:assert/strict'

import {
  changePasswordSchema,
  emailSchema,
  loginSchema,
  passwordInputSchema,
  passwordSchema,
  utf8ByteLength,
} from '../dist/index.js'

test('email input is trimmed and lowercased', () => {
  assert.equal(emailSchema.parse('  Ada@Example.COM '), 'ada@example.com')
  assert.equal(emailSchema.safeParse('not-an-email').success, false)
})

test('M10: new-password policy enforces the bcrypt 72-byte limit', () => {
  const ascii72 = 'Aa1!' + 'x'.repeat(68)
  const ascii73 = 'Aa1!' + 'x'.repeat(69)
  const utf8AtLimit = 'Aa1!' + 'é'.repeat(34) // 4 + 68 = 72 bytes
  const utf8OverLimit = 'Aa1!' + 'é'.repeat(35) // 4 + 70 = 74 bytes

  assert.equal(passwordSchema.safeParse(ascii72).success, true)
  assert.equal(passwordSchema.safeParse(ascii73).success, false)
  assert.equal(passwordSchema.safeParse(utf8AtLimit).success, true)
  assert.equal(passwordSchema.safeParse(utf8OverLimit).success, false)
  assert.equal(passwordInputSchema.safeParse('').success, false)
})

test('legacy existing passwords longer than 72 bytes are accepted and truncated', () => {
  const ascii100 = 'Aa1!' + 'x'.repeat(96)
  const ascii300 = 'Aa1!' + 'x'.repeat(296)

  const truncated = passwordInputSchema.parse(ascii100)
  assert.equal(truncated.length, 72)
  assert.equal(utf8ByteLength(truncated), 72)
  assert.equal(truncated, ascii100.slice(0, 72))
  assert.equal(passwordInputSchema.parse(ascii300).length, 72)

  // 84 bytes; the 72-byte cut lands exactly on a code-point boundary here.
  const multibyte = 'Aa1!' + 'é'.repeat(40)
  const multibyteTruncated = passwordInputSchema.parse(multibyte)
  assert.equal(multibyteTruncated, 'Aa1!' + 'é'.repeat(34))
  assert.equal(utf8ByteLength(multibyteTruncated), 72)

  assert.equal(passwordInputSchema.safeParse('x'.repeat(1024)).success, true)
  assert.equal(passwordInputSchema.safeParse('x'.repeat(1025)).success, false)
})

test('login schema is strict and accepts legacy long passwords', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@b.co', password: 'secret' }).success, true)
  assert.equal(
    loginSchema.safeParse({ email: 'a@b.co', password: 'secret', extra: 1 }).success,
    false,
  )

  const parsed = loginSchema.parse({ email: 'a@b.co', password: 'x'.repeat(500) })
  assert.equal(parsed.password.length, 72)
})

test('change-password schema is strict, rejects reuse, and keeps the new-password policy', () => {
  const valid = {
    currentPassword: 'OldPass#1',
    newPassword: 'NewPass#2',
  }

  assert.equal(changePasswordSchema.safeParse(valid).success, true)
  assert.equal(changePasswordSchema.safeParse({ ...valid, extra: 1 }).success, false)
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: 'SamePass#1',
      newPassword: 'SamePass#1',
    }).success,
    false,
  )

  // A legacy current password may exceed 72 bytes.
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: 'Aa1!' + 'x'.repeat(296),
      newPassword: 'NewPass#2',
    }).success,
    true,
  )

  // The replacement password is still subject to the 72-byte policy.
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: 'OldPass#1',
      newPassword: 'Aa1!' + 'x'.repeat(69),
    }).success,
    false,
  )
})
