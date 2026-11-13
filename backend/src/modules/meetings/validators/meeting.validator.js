import {
  MAX_MEETING_DURATION_MINUTES,
  MAX_MEETING_LINK_LENGTH,
  MAX_MEETING_PARTICIPANTS,
  MAX_MEETING_TITLE_LENGTH,
  MIN_MEETING_DURATION_MINUTES,
} from '@hrms/shared'

import { ApiError } from '../../../lib/api-error.js'
import { isValidDate, parseDate } from '../../../lib/dates.js'

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/

export function normalizeMeetingLink(value) {
  const link = typeof value === 'string' ? value.trim() : ''
  if (!link) return { value: null }
  if (link.length > MAX_MEETING_LINK_LENGTH) {
    return { error: `Meeting link must be ${MAX_MEETING_LINK_LENGTH} characters or fewer.` }
  }
  let url
  try {
    url = new URL(link)
  } catch {
    return { error: 'Meeting link must be a valid URL.' }
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { error: 'Meeting link must start with http or https.' }
  }
  return { value: url.toString() }
}

export function validateMeetingCreate(body = {}) {
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) throw ApiError.validation('title is required.')
  if (title.length > MAX_MEETING_TITLE_LENGTH) {
    throw ApiError.validation(`title must be ${MAX_MEETING_TITLE_LENGTH} characters or fewer.`)
  }

  const startTime = parseDate(body.startTime)
  if (!isValidDate(startTime)) throw ApiError.validation('startTime must be a valid date.')

  const endTime = body.endTime ? parseDate(body.endTime) : null
  if (body.endTime && !endTime) throw ApiError.validation('endTime must be a valid date.')
  if (endTime && endTime <= startTime) throw ApiError.validation('endTime must be after startTime.')

  const durationMin = Number(body.durationMin ?? 0)
  if (!Number.isFinite(durationMin) || durationMin < 0) {
    throw ApiError.validation('durationMin must be a positive number.')
  }
  if (durationMin > 0 && durationMin < MIN_MEETING_DURATION_MINUTES) {
    throw ApiError.validation(`durationMin must be at least ${MIN_MEETING_DURATION_MINUTES}.`)
  }
  if (durationMin > MAX_MEETING_DURATION_MINUTES) {
    throw ApiError.validation(`durationMin must be at most ${MAX_MEETING_DURATION_MINUTES}.`)
  }

  const participants = Array.isArray(body.participants)
    ? [...new Set(body.participants.map((value) => String(value)))]
    : []
  if (participants.some((id) => !OBJECT_ID_RE.test(id))) {
    throw ApiError.validation('participants must contain valid employee ids.')
  }
  if (participants.length > MAX_MEETING_PARTICIPANTS) {
    throw ApiError.validation(`At most ${MAX_MEETING_PARTICIPANTS} participants are allowed.`)
  }

  const { value: meetingLink, error: linkError } = normalizeMeetingLink(body.meetingLink)
  if (linkError) throw ApiError.validation(linkError)

  return { title, startTime, endTime, durationMin, participants, meetingLink }
}
