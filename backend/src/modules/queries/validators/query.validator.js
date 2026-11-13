import {
  MAX_QUERY_ATTACHMENTS,
  MAX_QUERY_MESSAGE_LENGTH,
  MAX_QUERY_REVIEW_LENGTH,
  QUERY_STATUSES,
} from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/

export function validateQueryCreate(body = {}) {
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) throw ApiError.validation('message is required.')
  if (message.length > MAX_QUERY_MESSAGE_LENGTH) {
    throw ApiError.validation(`message must be ${MAX_QUERY_MESSAGE_LENGTH} characters or fewer.`)
  }

  let task = null
  if (body.task !== undefined && body.task !== null && body.task !== '') {
    if (!OBJECT_ID_RE.test(String(body.task))) throw ApiError.validation('task is not a valid id.')
    task = String(body.task)
  }

  const attachments = Array.isArray(body.attachments)
    ? body.attachments.map((value) => String(value)).filter(Boolean)
    : []
  if (attachments.length > MAX_QUERY_ATTACHMENTS) {
    throw ApiError.validation(`At most ${MAX_QUERY_ATTACHMENTS} attachments are allowed.`)
  }

  return { message, task, attachments }
}

export function validateQueryReview(body = {}) {
  if (!QUERY_STATUSES.includes(body.status)) {
    throw ApiError.validation(
      'status must be one of open, in_review, resolved, raised_again.',
    )
  }
  const review = typeof body.review === 'string' ? body.review.trim() : ''
  if (review.length > MAX_QUERY_REVIEW_LENGTH) {
    throw ApiError.validation(`review must be ${MAX_QUERY_REVIEW_LENGTH} characters or fewer.`)
  }
  return { status: body.status, review }
}
