import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
// import DateAndAssignedTask from "../components/DateAndAssignedTasks";
import TaskDetails from "../components/TasksDetails";
import TodaysWorkSummary from "../components/TodaysWorkSummary";
import EmployeeQuery from "../components/EmployeeQuery";
import AllQueries from "../components/AllQueries";
import employeeApi from "../../../lib/employeeApi";
import type { EmployeeDashboardData } from "../../../types/Employee";

const MyTasks: React.FC = () => {
  const [summary, setSummary] = React.useState<EmployeeDashboardData["todayWorkSummary"] | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Returns a Promise so callers can await it / chain .finally().
  const fetchSummary = React.useCallback(async () => {
    try {
      const res = await employeeApi.get<EmployeeDashboardData>("/dashboard");
      setSummary(res?.data?.todayWorkSummary ?? null);
    } catch (e) {
      setSummary(null);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchSummary().finally(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [fetchSummary]);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar />

      <main className="ml-60">
        <Header />

        <div className="space-y-6 p-6">
          {/* <DateAndAssignedTask /> */}
          <TaskDetails onStatusChanged={fetchSummary} />
          {!loading && <TodaysWorkSummary summary={summary ?? undefined} />}
          <EmployeeQuery />
          <AllQueries />
        </div>
      </main>
    </div>
  );
};

export default MyTasks;