/**
 * File upload policy and public resource-path defaults.
 *
 * Decision 8 (locked): MongoDB GridFS is the initial storage backend. Shared
 * code knows only about upload policy and the authenticated public resource
 * path — never about a storage vendor, an internal object key, or a signed URL.
 */

export const BYTES_PER_KB = 1024
export const BYTES_PER_MB = 1024 * 1024

/** Default maximum upload size for an organization. */
export const DEFAULT_MAX_UPLOAD_SIZE_MB = 10

/** Default maximum upload size in bytes. */
export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = DEFAULT_MAX_UPLOAD_SIZE_MB * BYTES_PER_MB

/** Default MIME allowlist for profile images and attachments. */
export const DEFAULT_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

/** Upload purposes accepted by the authenticated file endpoint. */
export const FILE_SCOPES = ['avatar', 'leave', 'task', 'query', 'general'] as const

export type FileScope = (typeof FILE_SCOPES)[number]

export const DEFAULT_FILE_SCOPE: FileScope = 'general'

/** Path prefix of the authenticated download endpoint. */
export const FILE_RESOURCE_PATH = '/api/v1/files'

export const MAX_FILENAME_LENGTH = 255
export const MAX_MIME_TYPE_LENGTH = 150

/**
 * Stable public URL for a stored file. The same value is returned regardless of
 * the storage backend, so swapping GridFS for object storage is invisible to
 * clients.
 */
export function buildFileResourceUrl(fileId: string): string {
  return `${FILE_RESOURCE_PATH}/${fileId}`
}

export function isWithinUploadSize(
  sizeInBytes: number,
  maxSizeMb: number = DEFAULT_MAX_UPLOAD_SIZE_MB,
): boolean {
  return sizeInBytes > 0 && sizeInBytes <= maxSizeMb * BYTES_PER_MB
}
