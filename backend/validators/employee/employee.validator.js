import { badRequest, optionalDate, optionalString, parseOptionalDate } from "./util.validator.js";

const PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?]).{8,}$/;

function pickAllowed(body, allowedMap) {
  const out = {};
  for (const [key, fn] of Object.entries(allowedMap)) {
    if (key in body) {
      const value = fn(body[key], body);
      if (value !== undefined) out[key] = value;
    }
  }
  return out;
}

// dob / endDate / address are edited through both the self-service profile
// routes and the admin employee routes, so the rules live in one place: an
// empty string clears a date, the date must parse, dob cannot be in the
// future, endDate cannot precede the job joinDate, and address is trimmed
// and capped at 300 characters. Returns the parsed values for the keys
// present in the body; invalid values are reported via errors.
export function optionalProfileFields(body, joinDate, errors) {
  const out = {};
  if ("dob" in body) {
    const d = parseOptionalDate(body.dob);
    if (d === undefined) errors.push("dob must be a valid date (YYYY-MM-DD).");
    else if (d && d.getTime() > Date.now()) errors.push("dob must not be in the future.");
    else out.dob = d;
  }
  if ("endDate" in body) {
    const d = parseOptionalDate(body.endDate);
    if (d === undefined) errors.push("endDate must be a valid date (YYYY-MM-DD).");
    else if (d && joinDate && d.getTime() < joinDate.getTime())
      errors.push("endDate must not be before the job joinDate.");
    else out.endDate = d;
  }
  if ("address" in body) {
    if (typeof body.address !== "string") errors.push("address must be a string.");
    else if (body.address.trim().length > 300) errors.push("address must be at most 300 characters.");
    else out.address = body.address.trim();
  }
  return out;
}

export function validateEmployeeCreate(body = {}) {
  const errors = [];
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = optionalString(body.firstName, 80);
  const lastName = optionalString(body.lastName, 80);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("A valid email is required.");
  }
  if (!password || !PASSWORD_RE.test(password)) {
    errors.push(
      "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character.",
    );
  }
  if (!firstName) errors.push("firstName is required.");
  if (!lastName) errors.push("lastName is required.");

  const role =
    body.role === "manager" || body.role === "employee" ? body.role : undefined;
  const manager = optionalObjectId(body.manager, errors, "manager is not a valid id.");
  if (role === "manager" && manager) {
    errors.push("A manager cannot be assigned a reporting manager.");
  }

  const joinDate = optionalDate(body.joinDate);
  const profileFields = optionalProfileFields(body, joinDate, errors);

  if (errors.length) throw badRequest("Invalid employee payload.", errors);

  return {
    email,
    password,
    firstName,
    lastName,
    role: role || "employee",
    phone: optionalString(body.phone, 40),
    department: optionalString(body.department, 80),
    designation: optionalString(body.designation, 80),
    manager: manager || null,
    job: {
      joinDate,
      endDate: profileFields.endDate,
      status: ["active", "on_leave", "terminated", "inactive"].includes(body.status)
        ? body.status
        : "active",
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    },
    personal: {
      dateOfBirth: optionalDate(body.dateOfBirth),
      gender: optionalString(body.gender, 40),
      address: profileFields.address,
      emergencyContact: optionalString(body.emergencyContact, 40),
    },
    profile: {
      bio: optionalString(body.bio, 1000),
      imageUrl: optionalString(body.imageUrl, 1000),
      dob: profileFields.dob,
      skills: Array.isArray(body.skills) ? body.skills.map((s) => String(s).trim()).filter(Boolean) : [],
    },
  };
}

export function validateEmployeeUpdate(body = {}, joinDate = null) {
  const errors = [];
  const payload = pickAllowed(body, {
    email: (v) => (typeof v === "string" ? v.trim().toLowerCase() : undefined),
    password: (v) => {
      if (typeof v !== "string" || !PASSWORD_RE.test(v)) {
        errors.push(
          "Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character.",
        );
        return undefined;
      }
      return v;
    },
    role: (v) => (v === "manager" || v === "employee" ? v : undefined),
    firstName: (v) => optionalString(v, 80),
    lastName: (v) => optionalString(v, 80),
    phone: (v) => optionalString(v, 40),
    department: (v) => optionalString(v, 80),
    designation: (v) => optionalString(v, 80),
    manager: (v) => optionalObjectId(v, errors, "manager is not a valid id."),
    joinDate: (v) => optionalDate(v),
    status: (v) =>
      ["active", "on_leave", "terminated", "inactive"].includes(v) ? v : undefined,
    isActive: (v) => (typeof v === "boolean" ? v : undefined),
    dateOfBirth: (v) => optionalDate(v),
    gender: (v) => optionalString(v, 40),
    emergencyContact: (v) => optionalString(v, 40),
    bio: (v) => optionalString(v, 1000),
    imageUrl: (v) => optionalString(v, 1000),
    skills: (v) =>
      Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean) : undefined,
  });

  if (payload.role === "manager" && payload.manager) {
    errors.push("A manager cannot be assigned a reporting manager.");
  }

  // address is validated and trimmed by the shared profile-field rules and
  // stored on personal.address, which is where the admin screens read it.
  const profileFields = optionalProfileFields(body, joinDate, errors);

  if (errors.length) throw badRequest("Invalid employee payload.", errors);
  return { ...payload, ...profileFields };
}

function optionalObjectId(value, errors, msg) {
  if (value === undefined || value === null || value === "") return null;
  if (!/^[0-9a-fA-F]{24}$/.test(String(value))) {
    errors.push(msg);
    return null;
  }
  return String(value);
}