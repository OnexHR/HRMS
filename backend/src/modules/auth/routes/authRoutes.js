import bcrypt from 'bcrypt'
import express from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../../config/env.js'

const router = express.Router()
const accounts = await Promise.all(env.demoAccounts.map(async (account) => ({
  ...account,
  passwordHash: account.password ? await bcrypt.hash(account.password, 10) : null,
})))
const dummyPasswordHash = await bcrypt.hash('invalid-demo-password', 10)

router.post('/login', async (req, res) => {
  if (!env.demoAuthEnabled) {
    return res.status(503).json({
      success: false,
      error: { message: 'Demo sign-in is not configured.' },
    })
  }

  const { identifier, password } = req.body ?? {}
  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier || !password) {
    return res.status(400).json({
      success: false,
      error: { message: 'Identifier and password are required.' },
    })
  }

  const account = accounts.find(({ id }) => id.toLowerCase() === identifier.trim().toLowerCase())
  const passwordMatches = await bcrypt.compare(password, account?.passwordHash ?? dummyPasswordHash)
  if (!account || !passwordMatches) {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid identifier or password.' },
    })
  }

  const accessToken = jwt.sign(
    { role: account.role },
    env.jwtSecret,
    { subject: account.id, expiresIn: env.jwtExpiresIn },
  )

  return res.json({
    success: true,
    data: {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: env.jwtExpiresIn,
      user: { id: account.id, role: account.role },
    },
  })
})

export default router
