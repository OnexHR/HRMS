import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import { env } from '../../../config/env.js'
import { OrganizationRegistration } from '../models/OrganizationRegistration.js'

const router = express.Router()
const otpStore = new Map()

const uploadDir = path.resolve(process.cwd(), 'uploads/registrations')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${safeName}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 6 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'application/pdf']
    cb(allowed.includes(file.mimetype) ? null : new Error('Unsupported file type'), false)
  },
})

const fields = upload.fields([
  { name: 'companyLogo', maxCount: 1 },
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'gstCertificate', maxCount: 1 },
  { name: 'supportingDocuments', maxCount: 1 },
  { name: 'additionalDocuments', maxCount: 1 },
])

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: { message } })
}

router.post('/otp/send', (req, res) => {
  const { channel, destination } = req.body ?? {}
  if (!['email', 'mobile'].includes(channel) || !destination) {
    return badRequest(res, 'A valid verification channel and destination are required.')
  }
  if (!env.otpProvider && env.nodeEnv === 'production') {
    return res.status(503).json({ success: false, error: { message: 'OTP provider is not configured.' } })
  }

  const otp = String(crypto.randomInt(100000, 999999))
  const verificationToken = crypto.randomBytes(24).toString('hex')
  const expiresAt = Date.now() + 10 * 60 * 1000
  otpStore.set(`${channel}:${destination}`, { otp, verificationToken, expiresAt })

  res.json({
    success: true,
    data: {
      expiresIn: 600,
      ...(env.nodeEnv !== 'production' ? { developmentOtp: otp } : {}),
    },
  })
})

router.post('/otp/verify', (req, res) => {
  const { channel, destination, otp } = req.body ?? {}
  const record = otpStore.get(`${channel}:${destination}`)
  if (!record || record.expiresAt < Date.now()) {
    return badRequest(res, 'The verification code has expired or was not requested.')
  }
  if (!/^\d{6}$/.test(String(otp)) || record.otp !== String(otp)) {
    return badRequest(res, 'The verification code is invalid.')
  }

  otpStore.delete(`${channel}:${destination}`)
  res.json({ success: true, data: { verificationToken: record.verificationToken } })
})

function requireDatabase(_req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: { message: 'Database is not connected. Set a reachable MONGODB_URI to enable organization registration.' },
    })
  }
  return next()
}

router.post('/registrations', requireDatabase, fields, async (req, res) => {
  try {
    let payload
    try {
      payload = JSON.parse(req.body.payload ?? '{}')
    } catch {
      return badRequest(res, 'Invalid registration payload.')
    }

    if (!payload.organizationName || !payload.organizationType || !payload.industry ||
        !payload.officialEmail || !payload.contactNumber || !payload.registeredAddress ||
        !payload.country || !payload.state || !payload.city || !payload.postalCode ||
        !payload.authorizedRepresentative?.fullName ||
        !payload.authorizedRepresentative?.designation ||
        !payload.authorizedRepresentative?.officialEmail ||
        !payload.authorizedRepresentative?.mobileNumber ||
        payload.declarationAccepted !== true ||
        payload.authorizedRepresentative?.emailVerified !== true ||
        payload.authorizedRepresentative?.mobileVerified !== true) {
      return badRequest(res, 'Required registration fields or verification status are missing.')
    }

    const certificate = req.files?.registrationCertificate?.[0]
    if (!certificate) return badRequest(res, 'Company registration certificate is required.')
    if (certificate.size > 5 * 1024 * 1024) return badRequest(res, 'Company registration certificate exceeds 5 MB.')

    const logo = req.files?.companyLogo?.[0]
    if (logo) {
      if (logo.size > 2 * 1024 * 1024) return badRequest(res, 'Company logo exceeds 2 MB.')
      if (!['image/png', 'image/jpeg'].includes(logo.mimetype)) return badRequest(res, 'Company logo must be PNG or JPG/JPEG.')
    }

    const serial = crypto.randomBytes(4).toString('hex').toUpperCase()
    const registrationId = `ONX-${new Date().getFullYear()}-${serial}`

    const fileEntry = (fieldName, file) => file ? {
      fieldName,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    } : null

    const documentFiles = ['registrationCertificate', 'gstCertificate', 'supportingDocuments', 'additionalDocuments']
      .map((fieldName) => fileEntry(fieldName, req.files?.[fieldName]?.[0]))
      .filter(Boolean)

    const registration = await OrganizationRegistration.create({
      ...payload,
      registrationId,
      companyLogo: fileEntry('companyLogo', req.files?.companyLogo?.[0]),
      documents: documentFiles,
      registrationStatus: 'Pending Verification',
      authorizedRepresentative: {
        ...payload.authorizedRepresentative,
        emailVerified: true,
        mobileVerified: true,
      },
    })

    res.status(201).json({
      success: true,
      data: {
        registrationId: registration.registrationId,
        organizationName: registration.organizationName,
        submissionDate: registration.createdAt,
        status: registration.registrationStatus,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } })
  }
})

export default router
