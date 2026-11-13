import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import LeaveBalance from "../components/LeaveBalance";
import NewLeaveRequestForm from "../components/NewLeaveRequestForm";
import LeaveHistoryTable from "../components/LeaveHistoryTable";

const ApplyForLeave: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar />

      <main className="ml-60">
        <Header />

        <div className="space-y-6 p-6">
          <LeaveBalance />
          <NewLeaveRequestForm />
          <LeaveHistoryTable />
        </div>
      </main>
    </div>
  );
};

export default ApplyForLeave;