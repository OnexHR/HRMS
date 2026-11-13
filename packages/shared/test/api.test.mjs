import test from 'node:test'
import assert from 'node:assert/strict'

import { API_ERROR_CODES, API_ERROR_STATUS, isApiErrorCode, isApiSuccess } from '../dist/index.js'

test('M8: error codes are canonical, unique, and mapped to HTTP statuses', () => {
  assert.equal(new Set(API_ERROR_CODES).size, API_ERROR_CODES.length)

  for (const code of API_ERROR_CODES) {
    const status = API_ERROR_STATUS[code]
    assert.ok(Number.isInteger(status), code)
    assert.ok(status >= 400 && status < 600, code)
    assert.equal(isApiErrorCode(code), true)
  }

  assert.equal(isApiErrorCode('FREE_FORM'), false)
  assert.equal(isApiErrorCode(400), false)
})

test('M8: status mapping covers the documented Stage 1 statuses', () => {
  assert.equal(API_ERROR_STATUS.VALIDATION_ERROR, 400)
  assert.equal(API_ERROR_STATUS.UNAUTHENTICATED, 401)
  assert.equal(API_ERROR_STATUS.FORBIDDEN, 403)
  assert.equal(API_ERROR_STATUS.NOT_FOUND, 404)
  assert.equal(API_ERROR_STATUS.CONFLICT, 409)
  assert.equal(API_ERROR_STATUS.PAYLOAD_TOO_LARGE, 413)
  assert.equal(API_ERROR_STATUS.UNSUPPORTED_MEDIA_TYPE, 415)
  assert.equal(API_ERROR_STATUS.RATE_LIMITED, 429)
  assert.equal(API_ERROR_STATUS.INTERNAL_ERROR, 500)
})

test('isApiSuccess narrows the response envelope', () => {
  const success = { success: true, data: { id: 'abc' } }
  const failure = {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Missing' },
  }

  assert.equal(isApiSuccess(success), true)
  assert.equal(isApiSuccess(failure), false)
})
