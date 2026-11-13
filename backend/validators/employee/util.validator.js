import mongoose from "mongoose";

export const ERROR_CODE = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

export function badRequest(message, errors) {
  const err = new Error(message);
  err.statusCode = ERROR_CODE.BAD_REQUEST;
  err.errors = errors;
  return err;
}

export function notFound(message) {
  const err = new Error(message);
  err.statusCode = ERROR_CODE.NOT_FOUND;
  return err;
}

export function conflict(message) {
  const err = new Error(message);
  err.statusCode = ERROR_CODE.CONFLICT;
  return err;
}

export function forbidden(message) {
  const err = new Error(message);
  err.statusCode = ERROR_CODE.FORBIDDEN;
  return err;
}

export function isObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

export function optionalString(value, max = 1000) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function optionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// Tri-state parser for the optional date fields shared by the profile and
// admin routes: a Date when the value parses, null when it is cleared (empty
// string) and undefined when it cannot be parsed as a date at all. Callers
// distinguish "cleared" from "invalid" so an empty string wipes the value
// while garbage is rejected with a 400.
export function parseOptionalDate(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}