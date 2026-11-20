export type EmployeeRole = "employee" | "manager" | "admin";

export type ProfileImage = { imageUrl?: string; bio?: string };

export type EmployeeJob = { joinDate?: string; status?: string; isActive?: boolean };
export type EmployeePersonal = { dateOfBirth?: string; gender?: string; address?: string; emergencyContact?: string };

export type EmployeeUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  employeeCode?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  role?: EmployeeRole;
  profile?: ProfileImage;
  bio?: string;
  joinDate?: string;
  status?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  skills?: string[];
  job?: EmployeeJob;
  personal?: EmployeePersonal;
  manager?: ManagerOption | string | null;
  refreshEmployee?: () => Promise<void>;
  [key: string]: unknown;
};

export type AttendanceToday = {
  status?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  workHours?: number;
  workingMinutes?: number;
  overtimeMinutes?: number;
  breakMinutes?: number;
  breakStart?: string | null;
  [key: string]: unknown;
};

export type EmployeeDashboardData = {
  attendanceToday?: AttendanceToday;
  summary?: Record<string, number>;
  taskSummary?: TaskSummary;
  recentActivity?: Array<{ type: string; at: string; meta?: Record<string, unknown> }>;
  meetings?: Array<{
    _id: string;
    title: string;
    startTime: string;
    endTime?: string | null;
    status: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type ManagerDashboardData = EmployeeDashboardData & {
  attendance?: Record<string, number>;
  pendingLeaves?: Array<{
    leaveType: string;
    fromDate: string;
    toDate: string;
    status: string;
    [key: string]: unknown;
  }>;
  alerts?: Array<{
    category: string;
    text: string;
    time: string;
    [key: string]: unknown;
  }>;
};

export type Task = {
  _id: string;
  title: string;
  taskId?: string;
  assignedTo?: { _id?: string; firstName?: string; lastName?: string; employeeCode?: string } | string | null;
  status?: string;
  priority?: string;
  dueDate?: string;
  description?: string;
  [key: string]: unknown;
};

export type TaskSummary = {
  total?: number;
  completed?: number;
  pending?: number;
  inProgress?: number;
  overdue?: number;
  [key: string]: unknown;
};

export type TeamAttendanceRow = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
  name?: string;
  department?: string;
  attendance?: string;
  activity?: string;
  checkIn?: string;
  checkOut?: string;
  workingMinutes?: number;
  [key: string]: unknown;
};

export type TeamAttendanceStats = Record<string, number>;
export type EmployeeMonthlyReport = {
  date: string;
  member: {
    name: string;
    employeeCode?: string;
    department?: string;
    designation?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: unknown;
  };
  days: Array<{ date: string; status?: string; [key: string]: unknown }>;
  summary: Record<string, number>;
  [key: string]: unknown;
};
export type AvailableEmployee = { _id: string; firstName?: string; lastName?: string; [key: string]: unknown };

export type ManagerOption = {
  _id: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
};

export type AdminEmployeeListItem = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: EmployeeRole;
  department?: string;
  isActive?: boolean;
  employeeCode?: string;
  job?: EmployeeJob;
  personal?: EmployeePersonal;
  manager?: ManagerOption | string | null;
  profile?: ProfileImage & { bio?: string; skills?: string[] };
  [key: string]: unknown;
};

export type AdminEmployeeDetail = AdminEmployeeListItem & {
  phone?: string;
  designation?: string;
  personal?: EmployeePersonal;
};
export type AdminEmployeeListResponse = {
  employees: AdminEmployeeListItem[];
  total: number;
  totalPages: number;
};
export type AdminEmployeeStats = {
  byDepartment?: Array<{ department: string; count: number }>;
  total?: number;
  byRole?: Record<string, number>;
  byStatus?: Record<string, number>;
  [key: string]: unknown;
};
