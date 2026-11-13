/**
 * Employee query (follow-up / remark) vocabulary.
 */

export const QUERY_STATUSES = [
  "open",
  "in_review",
  "resolved",
  "raised_again",
] as const;
export type QueryStatus = (typeof QUERY_STATUSES)[number];

export const DEFAULT_QUERY_STATUS: QueryStatus = "open";

export const QUERY_STATUS_LABELS: Record<QueryStatus, string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  raised_again: "Raised Again",
};

/** Statuses a reviewer may set through the review endpoint. */
export const REVIEWABLE_QUERY_STATUSES = ["in_review", "resolved", "raised_again"] as const;
export type ReviewableQueryStatus = (typeof REVIEWABLE_QUERY_STATUSES)[number];

export const MAX_QUERY_MESSAGE_LENGTH = 500;
export const MAX_QUERY_REVIEW_LENGTH = 1000;
export const MAX_QUERY_ATTACHMENTS = 5;

/**
 * A follow-up against the same task is flagged as "raised_again"; a first-time
 * query starts as "open".
 */
export function initialQueryStatus(repeatsTask: boolean): QueryStatus {
  return repeatsTask ? "raised_again" : "open";
}
