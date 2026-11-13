import type { EntityId, ISODateString } from "./api.js";

/**
 * File storage types.
 *
 * Decision 8 (locked): storage is behind a provider abstraction. GridFS cannot
 * sign URLs, so `getSignedUrl` is an **optional capability** rather than part
 * of the required contract. There is deliberately no `signedUrl` field in any
 * shared type: the public download URL is always the authenticated backend
 * resource path.
 */

/** Capabilities a provider reports at runtime. */
export interface StorageCapabilities {
  /** True only when the provider can mint time-limited direct-download URLs. */
  signedUrls: boolean;
}

/** Persisted metadata for one stored file. Provider-agnostic. */
export interface FileMetadata {
  id: EntityId;
  organizationId: EntityId;
  ownerId: EntityId;
  /** Provider-internal object key. Never exposed to clients. */
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  createdAt: ISODateString;
}

/**
 * Client-facing file descriptor. `url` is always the authenticated backend
 * resource (`/api/v1/files/:id`), regardless of the storage backend.
 */
export interface FileResource {
  id: EntityId;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

/** Effective upload policy for an organization. */
export interface FileUploadPolicy {
  maxSizeBytes: number;
  allowedMimeTypes: readonly string[];
}

export interface FileUploadResult {
  file: FileMetadata;
  resource: FileResource;
}
