/**
 * Cross-domain constants shared by the HRMS frontend and backend.
 *
 * Everything here must stay framework-agnostic: no Node built-ins, no React,
 * no database types.
 */

/** Default page index for paginated endpoints. */
export const DEFAULT_PAGE = 1

/** Default page size for paginated endpoints. */
export const DEFAULT_PAGE_SIZE = 20

/** Hard upper bound for a single page. */
export const MAX_PAGE_SIZE = 100

/** Minimum accepted password length. */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Maximum accepted password length in UTF-16 characters.
 *
 * bcrypt only consumes the first 72 **bytes** of its input, so the byte limit
 * below is the authoritative one. This character cap keeps the schema and the
 * error messages predictable for ASCII passwords.
 */
export const MAX_PASSWORD_LENGTH = 72

/** Maximum accepted password length in UTF-8 bytes (bcrypt's hard limit). */
export const MAX_PASSWORD_BYTES = 72

/**
 * Payload guard for existing-password input (login, current password).
 *
 * This is not a credential policy: the donor never enforced a maximum, so a
 * legacy password may be longer than 72 bytes. Only the first 72 UTF-8 bytes
 * are significant to bcrypt; this bound merely stops oversized request bodies.
 */
export const MAX_PASSWORD_INPUT_LENGTH = 1024
