import type { QueryStatus } from "../constants/query.js";
import type { EntityId, ISODateString, Nullable } from "./api.js";
import type { EmployeeSummary } from "./employee.js";
import type { FileMetadata } from "./file.js";

export interface QueryTaskRef {
  id: EntityId;
  taskId: string;
  title: string;
}

export interface EmployeeQueryRecord {
  id: EntityId;
  organizationId: EntityId;
  employeeId: EntityId;
  employee?: EmployeeSummary;
  taskId: Nullable<EntityId>;
  task: Nullable<QueryTaskRef>;
  message: string;
  status: QueryStatus;
  reviewedBy: Nullable<EntityId>;
  reviewer: Nullable<EmployeeSummary>;
  review: string;
  reviewedAt: Nullable<ISODateString>;
  attachments: FileMetadata[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface QueryStats {
  total: number;
  open: number;
  inReview: number;
  resolved: number;
  raisedAgain: number;
}

export interface QueryListQuery {
  page?: number;
  pageSize?: number;
  status?: QueryStatus;
}
