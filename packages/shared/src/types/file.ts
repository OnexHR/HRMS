import type { EntityId } from './api.js'

/**
 * Client-facing file types.
 *
 * Decision 8 (locked): the public download URL is always the authenticated
 * backend resource path. There is deliberately no `signedUrl` field and no
 * provider capability contract in Stage 1. Internal metadata (storage key,
 * checksum, owner, organization) stays server-side and never appears here (H4).
 */

/** Client-facing file descriptor. */
export interface FileResource {
  id: EntityId
  url: string
  filename: string
  mimeType: string
  size: number
}

/** Effective upload policy resolved by the backend for one upload. */
export interface FileUploadPolicy {
  maxSizeBytes: number
  allowedMimeTypes: readonly string[]
}
