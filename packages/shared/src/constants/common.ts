/**
 * Cross-domain constants shared by the HRMS frontend and backend.
 *
 * Everything here must stay framework-agnostic: no Node built-ins, no React,
 * no database types.
 */

/** Default page index for paginated endpoints. */
export const DEFAULT_PAGE = 1;

/** Default page size for paginated endpoints. */
export const DEFAULT_PAGE_SIZE = 20;

/** Hard upper bound for a single page. */
export const MAX_PAGE_SIZE = 100;

/** Minimum accepted password length. */
export const MIN_PASSWORD_LENGTH = 8;

/** Maximum accepted password length. */
export const MAX_PASSWORD_LENGTH = 128;
