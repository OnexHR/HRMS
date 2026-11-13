import mongoose from 'mongoose'

import {
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_FILE_SCOPE,
  FILE_SCOPES,
  MAX_FILENAME_LENGTH,
  isWithinUploadSize,
} from '@hrms/shared'

import { env } from '../../../config/env.js'
import { ApiError } from '../../../lib/api-error.js'
import Employee from '../../employees/models/employee.model.js'
import LeaveRequest from '../../leave/models/leave-request.model.js'
import Task from '../../tasks/models/task.model.js'
import EmployeeQuery from '../../queries/models/employee-query.model.js'
import FileAsset from '../models/file-asset.model.js'

export const BUCKET_NAME = 'uploads'

const ALLOWED = new Set(DEFAULT_ALLOWED_MIME_TYPES)

function bucket() {
  if (!mongoose.connection.db) {
    throw ApiError.internal('File storage is unavailable: no database connection.')
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME })
}

function startsWith(buffer, bytes) {
  if (buffer.length < bytes.length) return false
  return bytes.every((byte, index) => buffer[index] === byte)
}

function isProbablyText(buffer) {
  if (buffer.includes(0)) return false
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096))
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample)
    return true
  } catch {
    return false
  }
}

/**
 * Content sniffing.
 *
 * The declared multipart MIME type is client-controlled, so the stored type is
 * derived from the bytes. SVG is deliberately not accepted: it is executable in
 * a browser and has no safe inline rendering here.
 */
export function detectMimeType(buffer, declaredType = '', filename = '') {
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png'
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp'
  }
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf'
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06])) {
    // OOXML files are ZIP containers; trust the declared type only when it is
    // one of the two supported office formats.
    if (
      declaredType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      declaredType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return declaredType
    }
    const extension = String(filename).split('.').pop()?.toLowerCase()
    if (extension === 'docx') {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    if (extension === 'xlsx') {
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
  }
  if (isProbablyText(buffer)) return 'text/plain'
  return null
}

function normalizeScope(value) {
  return FILE_SCOPES.includes(value) ? value : DEFAULT_FILE_SCOPE
}

function safeFileName(value) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (!name) return 'upload'
  // Strip path separators and control characters; keep the display name.
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').trim()
  return (cleaned || 'upload').slice(0, MAX_FILENAME_LENGTH)
}

export async function saveUpload({ organizationId, uploadedBy, scope, file }) {
  if (!file || !file.buffer?.length) {
    throw ApiError.validation('A file is required in the `file` field.')
  }
  if (!isWithinUploadSize(file.size, env.maxUploadMb)) {
    throw ApiError.payloadTooLarge(`Files must be ${env.maxUploadMb} MB or smaller.`)
  }

  const originalName = safeFileName(file.originalname)
  const mimeType = detectMimeType(file.buffer, file.mimetype, originalName)
  if (!mimeType || !ALLOWED.has(mimeType)) {
    throw ApiError.unsupportedMediaType(
      'Unsupported file type. Allowed: PNG, JPEG, WebP, PDF, plain text, DOCX, XLSX.',
    )
  }

  const gridFsId = new mongoose.Types.ObjectId()
  const upload = bucket().openUploadStreamWithId(gridFsId, originalName, {
    contentType: mimeType,
    metadata: {
      organization: String(organizationId),
      uploadedBy: String(uploadedBy),
      scope: normalizeScope(scope),
    },
  })

  await new Promise((resolve, reject) => {
    upload.on('finish', resolve)
    upload.on('error', reject)
    upload.end(file.buffer)
  })

  try {
    const asset = await FileAsset.create({
      organization: organizationId,
      uploadedBy,
      scope: normalizeScope(scope),
      originalName,
      mimeType,
      size: file.size,
      gridFsId,
    })

    return {
      id: String(asset.gridFsId),
      name: asset.originalName,
      mime: asset.mimeType,
      size: asset.size,
    }
  } catch (error) {
    // Never leave an orphaned GridFS object when metadata creation fails.
    await bucket()
      .delete(gridFsId)
      .catch(() => {})
    throw error
  }
}

async function isReferencedByAccessibleDocument({ organizationId, principal, gridFsId }) {
  const id = String(gridFsId)

  const [avatarOwner, leave, task, query] = await Promise.all([
    Employee.findOne({ organization: organizationId, 'profile.avatarFileId': gridFsId })
      .select('_id')
      .lean(),
    LeaveRequest.findOne({ organization: organizationId, attachments: id })
      .select('employee')
      .lean(),
    Task.findOne({ organization: organizationId, attachments: id })
      .select('assignedTo assignedBy')
      .lean(),
    EmployeeQuery.findOne({ organization: organizationId, attachments: id })
      .select('employee')
      .lean(),
  ])

  // Avatars are visible to any authenticated member of the organization.
  if (avatarOwner) return true

  const isSelf = (employeeId) => String(employeeId) === principal.employeeId
  const isManagerOf = async (employeeId) => {
    if (principal.role !== 'manager') return false
    const employee = await Employee.findOne({
      _id: employeeId,
      organization: organizationId,
    })
      .select('manager')
      .lean()
    return String(employee?.manager ?? '') === principal.employeeId
  }

  if (leave) {
    if (isSelf(leave.employee)) return true
    return isManagerOf(leave.employee)
  }

  if (task) {
    if (isSelf(task.assignedTo) || isSelf(task.assignedBy)) return true
    return isManagerOf(task.assignedTo)
  }

  if (query) {
    if (isSelf(query.employee)) return true
    return isManagerOf(query.employee)
  }

  return false
}

export async function loadAccessibleFile({ organizationId, principal, fileId }) {
  const asset = await FileAsset.findOne({
    organization: organizationId,
    gridFsId: fileId,
  }).lean()

  if (!asset) throw ApiError.notFound('File not found.')

  const isOwner = String(asset.uploadedBy) === principal.employeeId
  const isAdmin = principal.role === 'admin'
  const referenced =
    !isOwner &&
    !isAdmin &&
    (await isReferencedByAccessibleDocument({
      organizationId,
      principal,
      gridFsId: asset.gridFsId,
    }))

  if (!isOwner && !isAdmin && !referenced) {
    // Do not disclose that the id exists to an unrelated employee.
    throw ApiError.notFound('File not found.')
  }

  return asset
}

export function openDownload(asset) {
  return bucket().openDownloadStream(asset.gridFsId)
}

/** Deletes uploader-owned (or admin-owned) files, never referenced files. */
export async function deleteFile({ organizationId, principal, fileId }) {
  const asset = await FileAsset.findOne({
    organization: organizationId,
    gridFsId: fileId,
  })
  if (!asset) throw ApiError.notFound('File not found.')

  const isOwner = String(asset.uploadedBy) === principal.employeeId
  if (!isOwner && principal.role !== 'admin') {
    throw ApiError.notFound('File not found.')
  }

  const [avatarOwner, leave, task, query] = await Promise.all([
    Employee.findOne({ organization: organizationId, 'profile.avatarFileId': asset.gridFsId })
      .select('_id')
      .lean(),
    LeaveRequest.findOne({ organization: organizationId, attachments: String(asset.gridFsId) })
      .select('_id')
      .lean(),
    Task.findOne({ organization: organizationId, attachments: String(asset.gridFsId) })
      .select('_id')
      .lean(),
    EmployeeQuery.findOne({
      organization: organizationId,
      attachments: String(asset.gridFsId),
    })
      .select('_id')
      .lean(),
  ])

  if (avatarOwner || leave || task || query) {
    throw ApiError.conflict('This file is attached to a record and cannot be deleted.')
  }

  await bucket()
    .delete(asset.gridFsId)
    .catch((error) => {
      if (error?.message !== 'File not found') throw error
    })
  await asset.deleteOne()
  return { id: String(asset.gridFsId), deleted: true }
}
