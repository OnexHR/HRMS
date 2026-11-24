// import React from "react";
// import { Eye, CalendarCheck, BarChart3, UsersRound } from "lucide-react";

// const QuickActions: React.FC = () => {
//   const actions = [
//     {
//       label: "View Team Attendance",
//       icon: Eye,
//       bg: "bg-blue-50",
//       iconColor: "text-[#2459A6]",
//     },
//     {
//       label: "Approve Leave Requests",
//       icon: CalendarCheck,
//       bg: "bg-pink-50",
//       iconColor: "text-pink-600",
//     },
//     {
//       label: "View Reports",
//       icon: BarChart3,
//       bg: "bg-green-50",
//       iconColor: "text-green-600",
//     },
//     {
//       label: "Team Members",
//       icon: UsersRound,
//       bg: "bg-indigo-50",
//       iconColor: "text-indigo-600",
//     },
//   ];

//   return (
//     <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
//       <h3 className="text-lg font-semibold text-[#10284A]">Quick Actions</h3>

//       <div className="mt-4 grid grid-cols-4 gap-4">
//         {actions.map((action) => (
//           <button
//             key={action.label}
//             type="button"
//             className={`flex items-center gap-3 rounded-xl p-4 text-left transition hover:opacity-90 ${action.bg}`}
//           >
//             <action.icon size={20} className={action.iconColor} />
//             <span className="text-sm font-semibold text-[#10284A]">
//               {action.label}
//             </span>
//           </button>
//         ))}
//       </div>
//     </section>
//   );
// };

// export default QuickActions;

import React from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, CalendarCheck, Coffee, Eye, Loader2, UsersRound } from "lucide-react";
import employeeApi from "../../../lib/employeeApi";
import type { AttendanceToday } from "../../../types/Employee";
import MeetingDialog from "../../../components/MeetingDialog";

const scrollToId = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

function formatTime(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const QuickActions: React.FC<{
  attendanceToday?: AttendanceToday;
  onRefresh: () => void | Promise<void>;
}> = ({ attendanceToday, onRefresh }) => {
  const navigate = useNavigate();
  const [showMeeting, setShowMeeting] = React.useState(false);
  const [breakBusy, setBreakBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const checkIn = attendanceToday?.checkIn ?? null;
  const checkOut = attendanceToday?.checkOut ?? null;
  const onBreak = attendanceToday?.status === "on_break";

  const actions = [
    {
      label: "View Team Attendance",
      icon: Eye,
      bg: "bg-blue-50",
      iconColor: "text-[#2459A6]",
      onClick: () => scrollToId("team-attendance-section"),
    },
    {
      label: "Approve Leave Requests",
      icon: CalendarCheck,
      bg: "bg-pink-50",
      iconColor: "text-pink-600",
      onClick: () => scrollToId("pending-leave-section"),
    },
    {
      label: "View Reports",
      icon: BarChart3,
      bg: "bg-green-50",
      iconColor: "text-green-600",
      onClick: () => navigate("/manager/reports"),
    },
    {
      label: "Team Members",
      icon: UsersRound,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      onClick: () => navigate("/manager/team-members"),
    },
  ];

  // The break endpoints reject a punch with no attendance record, so check in
  // first when needed rather than leaving the button dead.
  const handleBreakToggle = async () => {
    setBreakBusy(true);
    setActionError(null);
    try {
      if (onBreak) {
        await employeeApi.post("/attendance/break/end");
      } else {
        if (!checkIn) await employeeApi.post("/attendance/check-in");
        await employeeApi.post("/attendance/break/start");
      }
      await onRefresh();
    } catch (err: any) {
      setActionError(err.response?.data?.message || "Could not update your break.");
    } finally {
      setBreakBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-[#10284A]">Quick Actions</h3>

      <div className="mt-4 grid grid-cols-4 gap-4">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={`flex items-center gap-3 rounded-xl p-4 text-left transition hover:opacity-90 ${action.bg}`}
          >
            <action.icon size={20} className={action.iconColor} />
            <span className="text-sm font-semibold text-[#10284A]">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-[#F8FAFD] p-4">
        <p className="text-sm font-medium text-gray-500">
          Your status:{" "}
          <span className="font-semibold text-[#10284A]">
            {checkOut
              ? `Checked out at ${formatTime(checkOut)}`
              : checkIn
                ? `Checked in at ${formatTime(checkIn)}`
                : "Not checked in"}
          </span>
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            disabled={breakBusy || Boolean(checkOut)}
            onClick={handleBreakToggle}
            title={checkOut ? "You already checked out for today" : undefined}
            className="flex h-[85px] w-full items-center justify-center gap-3 rounded-xl border border-amber-200 bg-amber-50 text-[17px] font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {breakBusy ? <Loader2 size={23} className="animate-spin" /> : <Coffee size={23} />}
            <span>{onBreak ? "End Break" : "On Break"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMeeting(true)}
            className="flex h-[85px] w-full items-center justify-center gap-3 rounded-xl border border-purple-200 bg-purple-50 text-[17px] font-semibold text-purple-700 transition hover:bg-purple-100"
          >
            <UsersRound size={23} />
            <span>Start Meeting</span>
          </button>
        </div>

        {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}
      </div>

      <MeetingDialog
        open={showMeeting}
        onClose={() => setShowMeeting(false)}
        onCreated={() => onRefresh()}
        scope="manager"
      />
    </section>
  );
};

export default QuickActions;
