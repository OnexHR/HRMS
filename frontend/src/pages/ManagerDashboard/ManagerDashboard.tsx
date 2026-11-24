// import React from "react";
// import Sidebar from "../ManagerDashboard/components/Sidebar";
// import Header from "../ManagerDashboard/components/Header";

// import TodayAttendance from "./components/TodayAttendance";
// import CurrentActivity from "../ManagerDashboard/components/CurrentActivity";
// import PendingLeaveRequests from "../ManagerDashboard/components/PendingLeaveRequests";
// import AlertsNotifications from "../ManagerDashboard/components/AlertNotification";
// import TeamAttendanceTable from "./components/TeamAttendancetable";
// import Profile from "./sections/ManagerProfile";

// import QuickActions from "../ManagerDashboard/components/QuickActions";

// const ManagerDashboard: React.FC = () => {
//   return (
//     <div className="min-h-screen bg-slate-50 text-gray-800">
//       <Sidebar />

//       <main className="ml-60">
//         <Header />

//         <div className="space-y-6 p-6">
//           <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
//             <TodayAttendance />
//             <CurrentActivity />
//           </div>

//           <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
//             <PendingLeaveRequests />
//             <AlertsNotifications />
//           </div>

//           <TeamAttendanceTable />

//           <QuickActions />
//         </div>
//       </main>
//     </div>
//   );
// };

// export default ManagerDashboard;

import React from "react";
import Sidebar from "../ManagerDashboard/components/Sidebar";
import Header from "../ManagerDashboard/components/Header";

import TodayAttendance from "./components/TodayAttendance";
import CurrentActivity from "../ManagerDashboard/components/CurrentActivity";
import PendingLeaveRequests from "../ManagerDashboard/components/PendingLeaveRequests";
import AlertsNotifications from "../ManagerDashboard/components/AlertNotification";
import TeamAttendanceTable from "./components/TeamAttendancetable";

import QuickActions from "../ManagerDashboard/components/QuickActions";
import employeeApi from "../../lib/employeeApi";
import type { ManagerDashboardData } from "../../types/Employee";

const ManagerDashboard: React.FC = () => {
  const [dashboard, setDashboard] = React.useState<ManagerDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchDashboard = React.useCallback(async () => {
    try {
      setError(null);
      const res = await employeeApi.get<ManagerDashboardData>("/managers-dashboard");
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
      <Sidebar active="dashboard" />

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

          {/* No items-start: the two panels stretch to a shared height so the
              2x2 and 1x3 stat grids line up instead of leaving a ragged edge. */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <TodayAttendance />
            <CurrentActivity stats={dashboard?.attendance} loading={loading} />
          </div>

          <QuickActions
            attendanceToday={dashboard?.attendanceToday}
            onRefresh={fetchDashboard}
          />

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.4fr_1fr]" id="pending-leave-section">
            <PendingLeaveRequests
              requests={dashboard?.pendingLeaves}
              loading={loading}
              onReviewed={fetchDashboard}
            />
            <AlertsNotifications alerts={dashboard?.alerts} loading={loading} />
          </div>

          <div id="team-attendance-section">
            <TeamAttendanceTable />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerDashboard;
