import React from "react";

const Calendar: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F5F8FC] p-8">
      <h1 className="text-2xl font-bold text-[#10284A]">
        My Calendar
      </h1>

      <p className="mt-1 text-sm text-gray-500">
        View your meetings and scheduled activities.
      </p>

      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#10284A]">
          September 2026
        </h2>

        <p className="mt-3 text-sm text-gray-500">
          Calendar events will appear here.
        </p>
      </div>
    </div>
  );
};

export default Calendar;