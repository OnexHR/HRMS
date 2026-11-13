// import React from "react";
// import Sidebar from "./components/Sidebar";
// import Header from "./components/Header";
// import Calendar from "./Calendar";
// import TodayAttendance from "./components/TodayAttendance";
// import ApplyLeave from "./Sections/ApplyForLeave";
// import WorkSummary from "./components/WorkSummary";
// import AttendanceDetails from "./components/AttendanceDetails";
// import RecentActivity from "./components/RecentActivity";
// import MeetingSummary from "./components/MeetingSummary";

// const EmployeeDashboard: React.FC = () => {
//   const [activePage, setActivePage] = React.useState("dashboard");
//   return (
//     <div className="min-h-screen bg-slate-50 text-gray-800">
//       <Sidebar
//         onNavigate={setActivePage}
//         activePage={activePage}
//       />

//       <main className="ml-60">
//         <Header />

//         <div className="space-y-6 p-6">
//           {activePage === "dashboard" && (
//             <>
//               <TodayAttendance onLeaveRequest={() => setActivePage("applyLeave")} />
//               <WorkSummary />
//               <AttendanceDetails />

//               <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
//                 <RecentActivity />
//                 <MeetingSummary />
//               </div>
//             </>
//           )}

//           {activePage === "calendar" && <Calendar />}
//           {activePage === "applyLeave" && <ApplyLeave />}
//         </div>
//       </main>
//     </div>
//   );
// };

// export default EmployeeDashboard;


import React from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import TodayAttendance from "./components/TodayAttendance";
import WorkSummary from "./components/WorkSummary";
import AttendanceDetails from "./components/AttendanceDetails";
import RecentActivity from "./components/RecentActivity";
import MeetingSummary from "./components/MeetingSummary";
import employeeApi from "../../lib/employeeApi";
import type { EmployeeDashboardData } from "../../types/Employee";

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = React.useState<EmployeeDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboard = React.useCallback(async () => {
    try {
      setError(null);
      const res = await employeeApi.get<EmployeeDashboardData>("/dashboard");
      setDashboard(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar />

      <main className="ml-60">
        <Header
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

          <TodayAttendance
            attendanceToday={dashboard?.attendanceToday}
            loading={loading}
            onRefresh={fetchDashboard}
            onLeaveRequest={() => navigate("/employee/apply-leave")}
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
        </div>
      </main>
    </div>
  );
};

export default EmployeeDashboard;
