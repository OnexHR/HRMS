import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Footer2 from "../../components/Footer2";
import Calendar from "./Calendar";
import TodayAttendance from "./components/TodayAttendance";
import ApplyLeave from "./Sections/ApplyForLeave";
import WorkSummary from "./components/WorkSummary";
import AttendanceDetails from "./components/AttendanceDetails";
import RecentActivity from "./components/RecentActivity";
import MeetingSummary from "./components/MeetingSummary";
import { getDemoDashboard } from "../../lib/employeeDashboardDemo";
import type { EmployeeDashboardData } from "../../types/Employee";

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = React.useState("dashboard");
  const [dashboard, setDashboard] = React.useState<EmployeeDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboard = React.useCallback(async () => {
    try {
      setError(null);
      setDashboard(getDemoDashboard());
    } catch (demoError) {
      setDashboard(null);
      setError(demoError instanceof Error ? demoError.message : "Could not load demo dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6EDFF] via-[#EFF3FF] to-[#E3EAFF] text-gray-800">
      <Sidebar active="dashboard" />

      <main className="ml-60">
        <Header
          variant="dashboard"
          attendanceToday={dashboard?.attendanceToday}
          loading={loading}
          onRefresh={fetchDashboard}
        />

        <div className="space-y-6 p-6">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {error}
            </div>
          )}

          {activePage === "dashboard" && (
            <>
              <TodayAttendance
                attendanceToday={dashboard?.attendanceToday}
                loading={loading}
                onRefresh={fetchDashboard}
                onLeaveRequest={() => {
                  setActivePage("applyLeave");
                  navigate("/employee/apply-leave");
                }}
              />
              <WorkSummary
                summary={dashboard?.summary}
                taskSummary={dashboard?.taskSummary}
                attendanceToday={dashboard?.attendanceToday}
                loading={loading}
              />
              <AttendanceDetails />

              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                <RecentActivity activities={dashboard?.recentActivity} loading={loading} />
                <MeetingSummary meetings={dashboard?.meetings} loading={loading} />
              </div>
            </>
          )}

          {activePage === "calendar" && <Calendar />}
          {activePage === "applyLeave" && <ApplyLeave />}
        </div>
        <Footer2 />
      </main>
    </div>
  );
};

export default EmployeeDashboard;