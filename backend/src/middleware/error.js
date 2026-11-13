import { ApiError } from '../lib/api-error.js'
import { env } from '../config/env.js'

export function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}.`))
}

/**
 * Single error boundary. Every failure leaves the API as
 * `{ success: false, error: { code, message, details? } }`.
 */
export function errorHandler(error, _req, res, _next) {
  let apiError = null

  if (error instanceof ApiError) {
    apiError = error
  } else if (error?.name === 'ZodError' || Array.isArray(error?.issues)) {
    apiError = ApiError.validation(
      'The request is invalid.',
      (error.issues ?? []).map((issue) => ({
        path: Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? ''),
        message: issue.message,
      })),
    )
  } else if (error?.name === 'MulterError') {
    if (error.code === 'LIMIT_FILE_SIZE') {
      apiError = ApiError.payloadTooLarge(
        `Files must be ${env.maxUploadMb} MB or smaller.`,
      )
    } else {
      apiError = ApiError.validation(`Upload failed: ${error.message}`)
    }
  } else if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0]
    apiError = ApiError.conflict(
      field ? `A record with this ${field} already exists.` : 'A duplicate record already exists.',
    )
  } else if (error?.name === 'ValidationError') {
    apiError = ApiError.validation(
      'The request is invalid.',
      Object.values(error.errors ?? {}).map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    )
  } else if (error?.name === 'CastError') {
    apiError = ApiError.validation(`Invalid value for ${error.path}.`)
  } else if (error?.type === 'entity.parse.failed') {
    apiError = ApiError.validation('The request body is not valid JSON.')
  } else if (error?.type === 'entity.too.large') {
    apiError = ApiError.payloadTooLarge('The request body is too large.')
  }

  if (!apiError) {
    apiError = ApiError.internal()
    if (!env.isTest) {
      console.error('Unhandled API error:', error)
    }
  }

  const body = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
    },
  }
  if (apiError.details !== undefined) body.error.details = apiError.details

  return res.status(apiError.status).json(body)
}
