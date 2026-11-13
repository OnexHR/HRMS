/**
 * API transport types.
 *
 * Decision 4 (locked): every endpoint responds with `{ success, data, error }`.
 */

export type EntityId = string;
export type ISODateString = string;
export type Nullable<T> = T | null;

export interface ApiErrorBody {
  /** Stable machine-readable code, e.g. `VALIDATION_ERROR`. */
  code: string;
  /** Human-readable message safe to show to the user. */
  message: string;
  /** Field name when the error is attributable to one input. */
  field?: string;
  /** Extra context (validation issues, conflicting id, ...). */
  details?: Record<string, unknown>;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: ApiErrorBody;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
}

export type PaginatedApiResponse<T> = ApiResponse<Paginated<T>>;

/** Convenience guard for consumers handling a possibly-failed response. */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return response.success;
}
