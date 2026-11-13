/**
 * Normalization helpers for untrusted upload metadata (M5/S9).
 *
 * The backend remains the authority; these functions are shared so the
 * frontend produces the same canonical values the server stores.
 */

import { DEFAULT_ALLOWED_MIME_TYPES, MAX_FILENAME_LENGTH } from '../constants/file.js'

/** Common non-standard MIME aliases mapped to their canonical value. */
const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
}

/**
 * Canonical lowercase MIME type without parameters.
 *
 * `" IMAGE/PNG; charset=binary "` becomes `"image/png"`; `image/jpg` becomes
 * `image/jpeg`.
 */
export function normalizeMimeType(value: string): string {
  const [head] = value.split(';', 1)
  const normalized = head.trim().toLowerCase()
  return MIME_ALIASES[normalized] ?? normalized
}

/** True when the (possibly parameterized) MIME type is in the allowlist. */
export function isAllowedMimeType(
  mimeType: string,
  allowed: readonly string[] = DEFAULT_ALLOWED_MIME_TYPES,
): boolean {
  return allowed.includes(normalizeMimeType(mimeType))
}

/** File extensions accepted for each supported MIME type. */
export const FILE_EXTENSIONS_BY_MIME: Record<string, readonly string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
}

function stripControlCharacters(value: string): string {
  let result = ''
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code >= 0x20 && code !== 0x7f) result += character
  }
  return result
}

/**
 * Sanitizes a client-supplied filename:
 * - strips directory components (`../`, Windows paths),
 * - removes control characters and NUL bytes,
 * - removes leading hidden-file dots and trailing dots/spaces,
 * - truncates to `MAX_FILENAME_LENGTH` while preserving the extension.
 *
 * A filename that cannot be recovered becomes `"file"`.
 */
export function normalizeFilename(value: string): string {
  const base = (typeof value === 'string' ? value : '').split(/[\\/]/).pop() ?? ''
  let cleaned = stripControlCharacters(base)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .trim()
    .replace(/[. ]+$/, '')

  if (!cleaned) return 'file'

  if (cleaned.length > MAX_FILENAME_LENGTH) {
    const dot = cleaned.lastIndexOf('.')
    const extension = dot > 0 && cleaned.length - dot <= 12 ? cleaned.slice(dot) : ''
    const stem = extension ? cleaned.slice(0, dot) : cleaned
    const maxStem = Math.max(1, MAX_FILENAME_LENGTH - extension.length)
    cleaned = `${stem.slice(0, maxStem)}${extension}`
  }

  return cleaned
}

/** Lowercase extension including the dot, or `""` when there is none. */
export function fileExtensionOf(filename: string): string {
  const normalized = normalizeFilename(filename)
  const dot = normalized.lastIndexOf('.')
  return dot > 0 ? normalized.slice(dot).toLowerCase() : ''
}

/** True when the filename extension agrees with the MIME type (S9). */
export function isFilenameConsistentWithMime(filename: string, mimeType: string): boolean {
  const extensions = FILE_EXTENSIONS_BY_MIME[normalizeMimeType(mimeType)]
  if (!extensions) return false
  return extensions.includes(fileExtensionOf(filename))
}
