import { MAX_PASSWORD_BYTES, utf8ByteLength } from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { isValidDate, parseDate } from '../../../lib/dates.js'

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?]).{8,}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/

function text(value, max = 1000) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function objectId(value, errors, message) {
  if (value === undefined || value === null || value === '') return null
  if (!OBJECT_ID_RE.test(String(value))) {
    errors.push(message)
    return null
  }
  return String(value)
}

function parseOptionalDate(value, errors, field, { allowClear = true } = {}) {
  if (value === undefined) return undefined
  if (value === null || value === '') return allowClear ? null : undefined
  const date = parseDate(value)
  if (!isValidDate(date)) {
    errors.push(`${field} must be a valid date (YYYY-MM-DD).`)
    return undefined
  }
  return date
}

function assertValidPassword(value, errors) {
  if (typeof value !== 'string' || !PASSWORD_RE.test(value)) {
    errors.push(
      'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character.',
    )
    return
  }
  if (utf8ByteLength(value) > MAX_PASSWORD_BYTES) {
    errors.push(`Password must be at most ${MAX_PASSWORD_BYTES} bytes.`)
  }
}

export function optionalProfileFields(body, joinDate, errors) {
  const out = {}

  if ('dob' in body) {
    const dob = parseOptionalDate(body.dob, errors, 'dob')
    if (dob instanceof Date && dob.getTime() > Date.now()) {
      errors.push('dob must not be in the future.')
    } else if (dob !== undefined) {
      out.dob = dob
    }
  }

  if ('endDate' in body) {
    const endDate = parseOptionalDate(body.endDate, errors, 'endDate')
    if (endDate instanceof Date && joinDate instanceof Date && endDate < joinDate) {
      errors.push('endDate must not be before the job joinDate.')
    } else if (endDate !== undefined) {
      out.endDate = endDate
    }
  }

  if ('address' in body) {
    if (typeof body.address !== 'string') errors.push('address must be a string.')
    else if (body.address.trim().length > 300) errors.push('address must be at most 300 characters.')
    else out.address = body.address.trim()
  }

  return out
}

export function validateEmployeeCreate(body = {}) {
  const errors = []
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const firstName = text(body.firstName, 80)
  const lastName = text(body.lastName, 80)

  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email is required.')
  assertValidPassword(body.password, errors)
  if (!firstName) errors.push('firstName is required.')
  if (!lastName) errors.push('lastName is required.')

  const role = body.role === 'manager' || body.role === 'employee' ? body.role : undefined
  const manager = objectId(body.manager ?? body.managerId, errors, 'manager is not a valid id.')
  if (role === 'manager' && manager) {
    errors.push('A manager cannot be assigned a reporting manager.')
  }

  const joinDate = parseOptionalDate(body.joinDate, errors, 'joinDate') ?? null
  const profileFields = optionalProfileFields(body, joinDate, errors)
  const dateOfBirth = parseOptionalDate(body.dateOfBirth, errors, 'dateOfBirth') ?? null
  const avatarFileId = objectId(
    body.avatarFileId ?? body.imageFileId,
    errors,
    'avatarFileId is not a valid id.',
  )

  if (errors.length) throw ApiError.validation('Invalid employee payload.', { issues: errors })

  return {
    email,
    password: body.password,
    firstName,
    lastName,
    role: role || 'employee',
    phone: text(body.phone, 40),
    department: text(body.department, 80),
    designation: text(body.designation, 80),
    manager: manager || null,
    job: {
      joinDate,
      endDate: profileFields.endDate ?? null,
      status: ['active', 'on_leave', 'terminated', 'inactive'].includes(body.status)
        ? body.status
        : 'active',
      isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    },
    personal: {
      dateOfBirth,
      gender: text(body.gender, 40),
      address: profileFields.address ?? '',
      emergencyContact: text(body.emergencyContact, 40),
    },
    profile: {
      bio: text(body.bio, 500),
      avatarFileId,
      skills: Array.isArray(body.skills)
        ? body.skills.map((skill) => String(skill).trim()).filter(Boolean).slice(0, 20)
        : [],
    },
  }
}

function pickAllowed(body, allowed, errors) {
  const out = {}
  for (const [key, parse] of Object.entries(allowed)) {
    if (key in body) {
      const value = parse(body[key], body)
      if (value !== undefined) out[key] = value
    }
  }
  return out
}

export function validateEmployeeUpdate(body = {}, joinDate = null) {
  const errors = []

  const payload = pickAllowed(
    body,
    {
      email: (value) => {
        if (typeof value !== 'string') return undefined
        const email = value.trim().toLowerCase()
        if (!EMAIL_RE.test(email)) {
          errors.push('A valid email is required.')
          return undefined
        }
        return email
      },
      password: (value) => {
        assertValidPassword(value, errors)
        return typeof value === 'string' ? value : undefined
      },
      role: (value) => (value === 'manager' || value === 'employee' ? value : undefined),
      firstName: (value) => text(value, 80) || undefined,
      lastName: (value) => text(value, 80) || undefined,
      phone: (value) => text(value, 40),
      department: (value) => text(value, 80),
      designation: (value) => text(value, 80),
      manager: (value) => objectId(value, errors, 'manager is not a valid id.'),
      joinDate: (value) => parseOptionalDate(value, errors, 'joinDate'),
      status: (value) =>
        ['active', 'on_leave', 'terminated', 'inactive'].includes(value) ? value : undefined,
      isActive: (value) => (typeof value === 'boolean' ? value : undefined),
      dateOfBirth: (value) => parseOptionalDate(value, errors, 'dateOfBirth'),
      gender: (value) => text(value, 40),
      emergencyContact: (value) => text(value, 40),
      bio: (value) => text(value, 500),
      avatarFileId: (value) => objectId(value, errors, 'avatarFileId is not a valid id.'),
      skills: (value) =>
        Array.isArray(value)
          ? value.map((skill) => String(skill).trim()).filter(Boolean).slice(0, 20)
          : undefined,
    },
    errors,
  )

  if (payload.role === 'manager' && payload.manager) {
    errors.push('A manager cannot be assigned a reporting manager.')
  }

  const profileFields = optionalProfileFields(body, joinDate, errors)
  if (errors.length) throw ApiError.validation('Invalid employee payload.', { issues: errors })

  return { ...payload, ...profileFields }
}

/**
 * A manager creating an employee may only create an `employee` assigned to
 * themselves. The route guard already restricts the caller to manager/admin.
 */
export function buildManagerEmployeePayload(body = {}, managerId) {
  if (!managerId) throw ApiError.forbidden('Manager context is required.')
  if (body.role === 'manager' || body.role === 'admin') {
    throw ApiError.forbidden('Managers can only create employee team members.')
  }

  return {
    ...validateEmployeeCreate({ ...body, manager: managerId, role: 'employee' }),
    manager: managerId,
    role: 'employee',
  }
}

export function assertObjectId(value, message = 'Must be a valid identifier.') {
  if (!OBJECT_ID_RE.test(String(value))) throw ApiError.validation(message)
  return String(value)
}
