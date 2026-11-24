import React from "react";
import { CalendarClock } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import LeaveBalance from "../components/LeaveBalance";
import NewLeaveRequestForm from "../components/NewLeaveRequestForm";
import LeaveHistoryTable from "../components/LeaveHistoryTable";
import DraftRequests from "../components/DraftRequests";
import Footer2 from "../../../components/Footer2";

const ApplyForLeave: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#E6EDFF] via-[#EFF3FF] to-[#E3EAFF] text-gray-800">
      <Sidebar active="apply-leave" />

      <main className="ml-60 flex flex-1 flex-col">
        {/* Top bar only; this page draws its own title banner below */}
        <Header hideBanner />

        <div className="flex-1 space-y-6 p-6 pt-5">
          {/* Page banner */}
          <div className="relative flex min-h-[104px] items-center overflow-hidden rounded-2xl border border-[#B8C9EF] bg-gradient-to-r from-[#DCE7FF] via-[#E7EEFF] to-[#D5E2FF] px-6 py-3 shadow-[0_12px_30px_rgba(37,70,170,0.14)]">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-blue-300/20" />
            <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-blue-300/15" />

            <div className="relative flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#1D4ED8] shadow-sm">
                <CalendarClock size={25} strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-[24px] font-extrabold leading-tight text-[#14226B] sm:text-[26px]">
                  Leave Request
                </h2>
                <p className="mt-1 text-[14px] font-medium text-[#1D2A78]">
                  Plan your leave and keep your team informed.
                </p>
              </div>
            </div>
          </div>

          <LeaveBalance />
          <NewLeaveRequestForm />
          <LeaveHistoryTable />
          <DraftRequests />
        </div>

        <Footer2 />
      </main>
    </div>
  );
};

export default ApplyForLeave;