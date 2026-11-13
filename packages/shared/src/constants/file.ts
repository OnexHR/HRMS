/**
 * File upload policy and resource-path defaults.
 *
 * Decision 8 (locked): MongoDB GridFS is the initial storage backend, hidden
 * behind a `StorageProvider` abstraction. Shared code only knows about upload
 * policy and the public resource path — never about a storage vendor and never
 * about signed URLs.
 */

export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = 1024 * 1024;

/** Default maximum upload size for an organization. */
export const DEFAULT_MAX_UPLOAD_SIZE_MB = 10;

/** Default maximum upload size in bytes. */
export const DEFAULT_MAX_UPLOAD_SIZE_BYTES = DEFAULT_MAX_UPLOAD_SIZE_MB * BYTES_PER_MB;

/** Default MIME allowlist for profile images and attachments. */
export const DEFAULT_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

/** Path prefix of the authenticated download endpoint. */
export const FILE_RESOURCE_PATH = "/api/v1/files";

export const MAX_FILENAME_LENGTH = 255;
export const MAX_MIME_TYPE_LENGTH = 150;

/**
 * Stable public URL for a stored file. The same value is returned regardless of
 * the storage backend, so swapping GridFS for object storage is invisible to
 * clients.
 */
export function buildFileResourceUrl(fileId: string): string {
  return `${FILE_RESOURCE_PATH}/${fileId}`;
}

export function isAllowedMimeType(
  mimeType: string,
  allowed: readonly string[] = DEFAULT_ALLOWED_MIME_TYPES,
): boolean {
  return allowed.includes(mimeType);
}

export function isWithinUploadSize(
  sizeInBytes: number,
  maxSizeMb: number = DEFAULT_MAX_UPLOAD_SIZE_MB,
): boolean {
  return sizeInBytes > 0 && sizeInBytes <= maxSizeMb * BYTES_PER_MB;
}
