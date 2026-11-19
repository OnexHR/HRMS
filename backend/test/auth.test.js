import assert from 'node:assert/strict'
import { once } from 'node:events'
import { after, before, test } from 'node:test'
import jwt from 'jsonwebtoken'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-only-jwt-secret-with-at-least-32-characters'
process.env.JWT_EXPIRES_IN = '1h'
process.env.DEMO_ADMIN_ID = 'admin.test'
process.env.DEMO_ADMIN_PASSWORD = 'admin-test-password'
process.env.DEMO_MANAGER_ID = 'manager.test'
process.env.DEMO_MANAGER_PASSWORD = 'manager-test-password'
process.env.DEMO_EMPLOYEE_ID = 'employee.test'
process.env.DEMO_EMPLOYEE_PASSWORD = 'employee-test-password'

const { app } = await import('../src/app.js')

let server
let apiBase

before(async () => {
  server = app.listen(0)
  await once(server, 'listening')
  apiBase = `http://127.0.0.1:${server.address().port}/api/v1/auth/login`
})

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
})

test('demo accounts sign in with their assigned roles', async () => {
  const accounts = [
    { identifier: 'admin.test', password: 'admin-test-password', role: 'admin' },
    { identifier: 'manager.test', password: 'manager-test-password', role: 'manager' },
    { identifier: 'employee.test', password: 'employee-test-password', role: 'employee' },
  ]

  for (const account of accounts) {
    const response = await fetch(apiBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    })
    const result = await response.json()

    assert.equal(response.status, 200)
    assert.equal(result.data.user.role, account.role)
    assert.equal(result.data.user.id, account.identifier)
    assert.equal(jwt.verify(result.data.accessToken, process.env.JWT_SECRET).role, account.role)
  }
})

test('invalid demo credentials are rejected without identifying the account', async () => {
  const response = await fetch(apiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin.test', password: 'incorrect' }),
  })
  const result = await response.json()

  assert.equal(response.status, 401)
  assert.equal(result.error.message, 'Invalid identifier or password.')
})

test('CORS preflight allows local Vite origins on alternate ports', async () => {
  const response = await fetch(apiBase, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5174',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })

  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5174')
  assert.match(response.headers.get('access-control-allow-methods') ?? '', /POST/)
})

test('CORS preflight does not allow arbitrary origins', async () => {
  const response = await fetch(apiBase, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://example.invalid',
      'Access-Control-Request-Method': 'POST',
    },
  })

  assert.equal(response.headers.get('access-control-allow-origin'), null)
})
