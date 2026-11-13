import { ApiError } from '../lib/api-error.js'

/** Parses a Zod schema and converts failures into the canonical API error. */
export function parseWith(schema, value, message = 'The request is invalid.') {
  const result = schema.safeParse(value)
  if (result.success) return result.data

  const issues = result.error.issues.map((issue) => ({
    path: issue.path.join('.') || '(body)',
    message: issue.message,
  }))

  throw ApiError.validation(message, { issues })
}
