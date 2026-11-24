import React from "react";
import { ClipboardList } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Footer2 from "../../../components/Footer2";
// import DateAndAssignedTask from "../components/DateAndAssignedTasks";
import TaskDetails from "../components/TasksDetails";
import TodaysWorkSummary from "../components/TodaysWorkSummary";
import EmployeeQuery from "../components/EmployeeQuery";
import AllQueries from "../components/AllQueries";
import employeeApi from "../../../lib/employeeApi";
import { getDemoTaskSummary, type DemoEmployeeTask } from "../../../lib/employeeTaskDemo";
import type { TodayWorkSummaryData } from "../components/TodaysWorkSummary";

const MyTasks: React.FC = () => {
  const [summary, setSummary] = React.useState<TodayWorkSummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Returns a Promise so callers can await it / chain .finally().
  const fetchSummary = React.useCallback(async (
    demoTasks?: ReadonlyArray<Pick<DemoEmployeeTask, "status">>,
  ) => {
    if (demoTasks) {
      setSummary(getDemoTaskSummary(demoTasks));
      return;
    }

    try {
      const res = await employeeApi.get<{ todayWorkSummary?: TodayWorkSummaryData }>("/dashboard");
      setSummary(res?.data?.todayWorkSummary ?? getDemoTaskSummary());
    } catch (summaryError) {
      console.error("Could not load task summary from the API; showing sample summary.", summaryError);
      setSummary(getDemoTaskSummary());
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;

    employeeApi
      .get<{ todayWorkSummary?: TodayWorkSummaryData }>("/dashboard")
      .then((res) => {
        if (mounted) setSummary(res?.data?.todayWorkSummary ?? getDemoTaskSummary());
      })
      .catch((summaryError) => {
        if (!mounted) return;
        console.error("Could not load task summary from the API; showing sample summary.", summaryError);
        setSummary(getDemoTaskSummary());
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E6EDFF] via-[#EFF3FF] to-[#E3EAFF] text-gray-800">
      <Sidebar active="my-tasks" />

      <main className="ml-60">
        <Header hideBanner />

        <div className="space-y-6 p-6 pt-5">
          <div className="relative flex min-h-[104px] items-center overflow-hidden rounded-2xl border border-[#B8C9EF] bg-gradient-to-r from-[#DCE7FF] via-[#E7EEFF] to-[#D5E2FF] px-6 py-3 shadow-[0_12px_30px_rgba(37,70,170,0.14)]">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-blue-300/20" />
            <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-blue-300/15" />

            <div className="relative flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#1D4ED8] shadow-sm">
                <ClipboardList size={25} strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-[24px] font-extrabold leading-tight text-[#14226B] sm:text-[26px]">
                  Worklist
                </h2>
                <p className="mt-1 text-[14px] font-medium text-[#1D2A78]">
                  Manage your assigned work and track your progress.
                </p>
              </div>
            </div>
          </div>

          {/* <DateAndAssignedTask /> */}
          <TaskDetails onStatusChanged={fetchSummary} />
          {!loading && <TodaysWorkSummary summary={summary ?? undefined} />}
          <EmployeeQuery />
          <AllQueries />
        </div>
        <Footer2 />
      </main>
    </div>
  );
};

export default MyTasks;