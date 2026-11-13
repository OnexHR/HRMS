import type { EntityId, ISODateString } from "./api.js";

/**
 * Organization settings.
 *
 * Decision 3 (locked): one organization per employee, so every domain record
 * carries `organizationId`.
 * Decision 5 (locked): attendance policy is organization-configurable. A
 * future department override will reuse `AttendancePolicySettings`.
 */

export interface AttendancePolicySettings {
  /** IANA timezone used for all time-of-day rules. */
  timezone: string;
  shiftStartMinutes: number;
  lateGraceMinutes: number;
  halfDayCheckInMinutes: number;
  halfDayCheckOutMinutes: number;
  lateNightCheckInMinutes: number;
  overtimeStartMinutes: number;
  overtimeEndMinutes: number;
  maxBreakMinutes: number;
  standardDayMinutes: number;
  /** 0 = Sunday. */
  workingWeekdays: number[];
}

export interface FilePolicySettings {
  maxUploadSizeMb: number;
  allowedMimeTypes: string[];
}

export interface OrganizationSettings {
  attendance: AttendancePolicySettings;
  files: FilePolicySettings;
}

export interface Organization {
  id: EntityId;
  name: string;
  slug: string;
  isActive: boolean;
  settings: OrganizationSettings;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface OrganizationSummary {
  id: EntityId;
  name: string;
  slug: string;
}

export interface Department {
  id: EntityId;
  organizationId: EntityId;
  name: string;
  code: string;
  managerId: EntityId | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface DepartmentSummary {
  id: EntityId;
  name: string;
  code: string;
}

/** Organization-level overrides apply to both nested groups. */
export type OrganizationSettingsPatch = {
  attendance?: Partial<AttendancePolicySettings>;
  files?: Partial<FilePolicySettings>;
};

export interface OrganizationCreateInput {
  name: string;
  slug: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
}
