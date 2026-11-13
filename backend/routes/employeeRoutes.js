import { Router } from "express";
import {
  authenticateAdmin,
  authenticateEmployee,
  authorizeEmployee,
} from "../middleware/employeeAuth.js";
import {
  handleAdminLogin,
  handleLogin,
  handleMe,
  handleChangePassword,
} from "../controllers/employee/authController.js";
import {
  handleCreateEmployee,
  handleListEmployees,
  handleListAvailableEmployees,
  handleAddTeamMember,
  handleRemoveTeamMember,
  handleGetEmployee,
  handleUpdateEmployee,
  handleDeleteEmployee,
  handleUpdateEmployeeStatus,
  handleAdminStats,
  handleAssignTask as handleAdminAssignTask,
  handleListManagers,
} from "../controllers/employee/adminController.js";
import {
  handleGetMe,
  handleUpdateMe,
} from "../controllers/employee/profileController.js";
import {
  handleCheckIn,
  handleCheckOut,
  handleBreakStart,
  handleBreakEnd,
  handleMyAttendanceToday,
  handleMyAttendanceMonth,
  handleMyAttendanceSummary,
  handleTeamAttendanceToday,
  handleTeamAttendanceStats,
  handleTeamAttendanceRows,
  handleTeamAttendanceMonth,
  handleTeamReports,
} from "../controllers/employee/attendanceController.js";
import {
  handleBalance,
  handleSubmitLeave,
  handleSaveDraft,
  handleUpdateDraft,
  handleCancelLeave,
  handleHistory,
  handlePendingForManager,
  handleReviewLeave,
} from "../controllers/employee/leaveController.js";
import {
  handleAssignTask,
  handleMyTasks,
  handleGetTask,
  handleGetTaskAttachmentUrl,
  handleUpdateTaskStatus,
  handleTeamTasks,
  handleTeamTaskSummary,
} from "../controllers/employee/taskController.js";
import {
  handleRaiseQuery,
  handleMyQueries,
  handleTeamQueries,
  handleReviewQuery,
  handleQueryStats,
} from "../controllers/employee/queryController.js";
import {
  handleMyMeetings,
  handleGetActiveMeeting,
  handleCreateMeeting,
  handleStartMeeting,
  handleEndMeeting,
  handleCalendarEvents,
  handleListColleagues,
} from "../controllers/employee/meetingController.js";
import {
  handleEmployeeDashboard,
  handleManagerDashboard,
  handleTeamMembers,
  handleTeamMemberDetail,
} from "../controllers/employee/dashboardController.js";

const router = Router();

// ------------------------------------------------------------- auth (open)
router.post("/auth/admin-login", handleAdminLogin);
router.post("/auth/login", handleLogin);

// ------------------------------------------------------------- auth (guarded)
router.get("/auth/me", authenticateAdmin, handleMe);
router.put("/auth/admin/change-password", authenticateAdmin, handleChangePassword);
router.put("/auth/change-password", authenticateEmployee, handleChangePassword);

// ------------------------------------------------------------- admin scope
router.use("/admin", authenticateAdmin);
router.get("/admin/stats", handleAdminStats);
router.get("/admin/managers", handleListManagers);
router.post("/admin/employees", handleCreateEmployee);
router.get("/admin/employees", handleListEmployees);
router.get("/admin/employees/:id", handleGetEmployee);
router.put("/admin/employees/:id", handleUpdateEmployee);
router.delete("/admin/employees/:id", handleDeleteEmployee);
router.patch("/admin/employees/:id/status", handleUpdateEmployeeStatus);
router.post("/admin/tasks", handleAdminAssignTask);

// ------------------------------------------------------------- profile (self)
router.get("/me", authenticateEmployee, handleGetMe);
router.put("/me", authenticateEmployee, handleUpdateMe);

// ------------------------------------------------------------- attendance (self)
router.post("/attendance/check-in", authenticateEmployee, handleCheckIn);
router.post("/attendance/check-out", authenticateEmployee, handleCheckOut);
router.post("/attendance/break/start", authenticateEmployee, handleBreakStart);
router.post("/attendance/break/end", authenticateEmployee, handleBreakEnd);
router.get("/attendance/today", authenticateEmployee, handleMyAttendanceToday);
router.get("/attendance/month", authenticateEmployee, handleMyAttendanceMonth);
router.get("/attendance/summary", authenticateEmployee, handleMyAttendanceSummary);

// ------------------------------------------------------------- leave (self)
router.get("/leave/balance", authenticateEmployee, handleBalance);
router.post("/leave", authenticateEmployee, handleSubmitLeave);
router.post("/leave/draft", authenticateEmployee, handleSaveDraft);
router.put("/leave/:id/draft", authenticateEmployee, handleUpdateDraft);
router.post("/leave/:id/cancel", authenticateEmployee, handleCancelLeave);
router.get("/leave/history", authenticateEmployee, handleHistory);

// ------------------------------------------------------------- tasks
router.get("/tasks", authenticateEmployee, handleMyTasks);
router.post("/tasks", authenticateEmployee, authorizeEmployee(["manager"]), handleAssignTask);
router.get("/tasks/team", authenticateEmployee, authorizeEmployee(["manager"]), handleTeamTasks);
router.get("/tasks/team/summary", authenticateEmployee, authorizeEmployee(["manager"]), handleTeamTaskSummary);
router.get("/tasks/:id", authenticateEmployee, handleGetTask);
router.get("/tasks/:taskId/attachments/:index/url", authenticateEmployee, handleGetTaskAttachmentUrl);
router.patch("/tasks/:id/status", authenticateEmployee, handleUpdateTaskStatus);

// ------------------------------------------------------------- queries
router.get("/queries/team", authenticateEmployee, authorizeEmployee(["manager"]), handleTeamQueries);
router.post("/queries/:id/review", authenticateEmployee, authorizeEmployee(["manager"]), handleReviewQuery);
router.post("/queries", authenticateEmployee, handleRaiseQuery);
router.get("/queries", authenticateEmployee, handleMyQueries);
router.get("/queries/stats", authenticateEmployee, handleQueryStats);

// ------------------------------------------------------------- meetings
router.get("/meetings", authenticateEmployee, handleMyMeetings);
router.get("/meetings/active", authenticateEmployee, handleGetActiveMeeting);
router.post("/meetings", authenticateEmployee, handleCreateMeeting);
router.post("/meetings/:id/start", authenticateEmployee, handleStartMeeting);
router.post("/meetings/:id/end", authenticateEmployee, handleEndMeeting);
router.get("/calendar/events", authenticateEmployee, handleCalendarEvents);

// ------------------------------------------------------------- dashboards (self)
router.get("/dashboard", authenticateEmployee, handleEmployeeDashboard);

// Employees may invite their own team to a meeting, so they need a scoped
// directory; /team/available is manager-only and returns the whole company.
router.get("/colleagues", authenticateEmployee, handleListColleagues);

// ------------------------------------------------------------- manager scope
router.use("/team", authenticateEmployee, authorizeEmployee(["manager"]));
router.get("/team", handleTeamMembers);
router.get("/team/attendance", handleTeamAttendanceToday);
router.get("/team/available", handleListAvailableEmployees);
router.post("/team/assign", handleAddTeamMember);
router.delete("/team/assign/:id", handleRemoveTeamMember);
router.get("/team/attendance/stats", handleTeamAttendanceStats);
router.get("/team/attendance/rows", handleTeamAttendanceRows);
router.get("/team/attendance/month", handleTeamAttendanceMonth);
router.get("/team/reports", handleTeamReports);
router.get("/team/member/:id", handleTeamMemberDetail);
router.get("/team/leave/pending", handlePendingForManager);
router.patch("/team/leave/:id/status", handleReviewLeave);

router.get("/managers-dashboard", authenticateEmployee, authorizeEmployee(["manager"]), handleManagerDashboard);

export default router;