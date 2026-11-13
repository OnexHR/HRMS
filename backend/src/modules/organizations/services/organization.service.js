import mongoose from 'mongoose'

import { env } from '../../../config/env.js'
import { ApiError } from '../../../lib/api-error.js'
import Organization from '../models/organization.model.js'

/**
 * Stage 1 has one organization per deployment. It is resolved by id (when the
 * environment pins one) or by slug, and created on demand for a fresh install.
 */
export async function resolveOrganization() {
  const pinnedId = env.organization.id
  if (pinnedId && mongoose.Types.ObjectId.isValid(pinnedId)) {
    const byId = await Organization.findById(pinnedId)
    if (!byId) throw ApiError.internal('The configured ORGANIZATION_ID does not exist.')
    return byId
  }

  const slug = env.organization.slug
  const existing = await Organization.findOne({ slug })
  if (existing) return existing

  return Organization.create({
    name: env.organization.name,
    slug,
    timezone: env.attendanceTimezone,
  })
}

export async function ensureOrganization() {
  try {
    return await resolveOrganization()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw ApiError.internal('Could not resolve the organization.')
  }
}
