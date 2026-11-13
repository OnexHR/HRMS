import { API_ERROR_STATUS } from '@hrms/shared'

/**
 * Domain error carrying a canonical API error code.
 *
 * Controllers and services throw these; the error middleware maps them to the
 * `{ success: false, error }` envelope. Never leak internal details through the
 * message: it is returned to the client verbatim.
 */
export class ApiError extends Error {
  constructor(code, message, details) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = API_ERROR_STATUS[code] ?? 500
    if (details !== undefined) this.details = details
  }

  static validation(message = 'The request is invalid.', details) {
    return new ApiError('VALIDATION_ERROR', message, details)
  }

  static unauthenticated(message = 'Authentication is required.') {
    return new ApiError('UNAUTHENTICATED', message)
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new ApiError('FORBIDDEN', message)
  }

  static notFound(message = 'The requested resource was not found.') {
    return new ApiError('NOT_FOUND', message)
  }

  static conflict(message = 'The request conflicts with the current state.') {
    return new ApiError('CONFLICT', message)
  }

  static payloadTooLarge(message = 'The uploaded file is too large.') {
    return new ApiError('PAYLOAD_TOO_LARGE', message)
  }

  static unsupportedMediaType(message = 'This file type is not supported.') {
    return new ApiError('UNSUPPORTED_MEDIA_TYPE', message)
  }

  static rateLimited(message = 'Too many requests. Try again later.', details) {
    return new ApiError('RATE_LIMITED', message, details)
  }

  static internal(message = 'Something went wrong.') {
    return new ApiError('INTERNAL_ERROR', message)
  }
}
