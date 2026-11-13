import {
  checkIn,
  checkOut,
  breakStart,
  breakEnd,
  monthlyAttendance,
  summaryForRange,
  teamAttendanceToday,
  teamAttendanceStats,
  teamAttendanceRows,
  teamAttendanceMonth,
  teamMonthlyReports,
} from "../../services/employee/attendance.service.js";
import { attendanceTodayFor } from "../../services/employee/dashboard.service.js";

export const handleCheckIn = async (req, res) => {
  try {
    const record = await checkIn(req.employee._id);
    return res.status(200).json({ attendance: record });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Check-in error:", error);
    return res.status(500).json({ message: "Could not check in." });
  }
};

export const handleCheckOut = async (req, res) => {
  try {
    const record = await checkOut(req.employee._id);
    return res.status(200).json({ attendance: record });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Check-out error:", error);
    return res.status(500).json({ message: "Could not check out." });
  }
};

export const handleBreakStart = async (req, res) => {
  try {
    const record = await breakStart(req.employee._id);
    return res.status(200).json({ attendance: record });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Break start error:", error);
    return res.status(500).json({ message: "Could not start break." });
  }
};

export const handleBreakEnd = async (req, res) => {
  try {
    const record = await breakEnd(req.employee._id);
    return res.status(200).json({ attendance: record });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Break end error:", error);
    return res.status(500).json({ message: "Could not end break." });
  }
};

export const handleMyAttendanceToday = async (req, res) => {
  try {
    const attendance = await attendanceTodayFor(req.employee._id);
    return res.status(200).json({ attendance });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Attendance today error:", error);
    return res.status(500).json({ message: "Could not load attendance." });
  }
};

export const handleMyAttendanceMonth = async (req, res) => {
  try {
    const data = await monthlyAttendance(req.employee._id, req.query.date || new Date());
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Attendance month error:", error);
    return res.status(500).json({ message: "Could not load attendance." });
  }
};

export const handleMyAttendanceSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const f = from ? new Date(from) : new Date(req.employee.job?.joinDate || new Date());
    const t = to ? new Date(to) : new Date();
    const data = await summaryForRange(req.employee._id, f, t);
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Attendance summary error:", error);
    return res.status(500).json({ message: "Could not load summary." });
  }
};

export const handleTeamAttendanceToday = async (req, res) => {
  try {
    const data = await teamAttendanceToday(req.employee._id);
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Team attendance error:", error);
    return res.status(500).json({ message: "Could not load team attendance." });
  }
};

export const handleTeamAttendanceStats = async (req, res) => {
  try {
    const data = await teamAttendanceStats(req.employee._id, req.query.date || new Date());
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Team attendance stats error:", error);
    return res.status(500).json({ message: "Could not load attendance summary." });
  }
};

export const handleTeamAttendanceRows = async (req, res) => {
  try {
    const data = await teamAttendanceRows(req.employee._id, req.query.date || new Date());
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Team attendance rows error:", error);
    return res.status(500).json({ message: "Could not load team attendance." });
  }
};

export const handleTeamAttendanceMonth = async (req, res) => {
  try {
    const data = await teamAttendanceMonth(req.employee._id, req.query.date || new Date());
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Team attendance month error:", error);
    return res.status(500).json({ message: "Could not load team attendance." });
  }
};

export const handleTeamReports = async (req, res) => {
  try {
    const data = await teamMonthlyReports(req.employee._id, req.query.date || new Date());
    return res.status(200).json(data);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
    console.error("Team reports error:", error);
    return res.status(500).json({ message: "Could not load team reports." });
  }
};