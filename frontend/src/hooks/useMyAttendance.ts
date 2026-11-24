import React from "react";
import employeeApi from "../lib/employeeApi";
import type { AttendanceToday } from "../types/Employee";

const ATTENDANCE_STATUS_KEY = "employee_attendance_status";
const ATTENDANCE_STATUS_EVENT = "employee-attendance-status-change";

// Check in/out is shared with the employee dashboard: the stored status is a
// hint for headers, while /attendance/today remains the source of truth.
const broadcastStatus = (status: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ATTENDANCE_STATUS_KEY, status);
  window.dispatchEvent(new Event(ATTENDANCE_STATUS_EVENT));
};

const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  }
  return fallback;
};

export function useMyAttendance() {
  const [attendanceToday, setAttendanceToday] = React.useState<AttendanceToday | undefined>();
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await employeeApi.get<{ attendance: AttendanceToday }>("/attendance/today");
      setAttendanceToday(response.data?.attendance ?? undefined);
      setError(null);
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "Could not load your attendance."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  React.useEffect(() => {
    const sync = () => void refresh();
    window.addEventListener(ATTENDANCE_STATUS_EVENT, sync);
    return () => window.removeEventListener(ATTENDANCE_STATUS_EVENT, sync);
  }, [refresh]);

  const runAction = React.useCallback(
    async (endpoint: string, status: string) => {
      setBusy(true);
      setError(null);
      try {
        await employeeApi.post(endpoint);
        broadcastStatus(status);
        await refresh();
      } catch (requestError: unknown) {
        setError(errorMessage(requestError, "That action could not be completed."));
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const checkIn = React.useCallback(() => runAction("/attendance/check-in", "online"), [runAction]);
  const checkOut = React.useCallback(() => runAction("/attendance/check-out", "offline"), [runAction]);

  const checkedIn = Boolean(attendanceToday?.checkIn && !attendanceToday?.checkOut);
  const onBreak = attendanceToday?.status === "on_break";

  return { attendanceToday, loading, busy, error, refresh, checkIn, checkOut, checkedIn, onBreak };
}

export default useMyAttendance;
