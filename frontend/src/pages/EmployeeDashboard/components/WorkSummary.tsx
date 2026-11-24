import React from "react";
import type { AttendanceToday } from "../../../types/Employee";
import {
  CalendarClock,
  CalendarDays,
  Check,
  Clock3,
  Hourglass,
  ClipboardCheck,
} from "lucide-react";

type Summary = {
  startDate?: string;
  endDate?: string;
  totalWorkingMinutes?: number;
  totalOvertimeMinutes?: number;
  presentDays?: number;
  tasksCompleted?: number;
};

type TaskSummary = {
  total?: number;
  completed?: number;
};

function formatDate(value?: string) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDuration(minutes?: number) {
  const total = Math.max(0, Math.floor(minutes ?? 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

// Every card shares this layout: round icon + label on one line, value
// centred underneath.
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  tone: string;
  label: string;
  value: React.ReactNode;
}> = ({ icon, tone, label, value }) => (
  // The card is a CSS size container, so the label font scales with the card's
  // own width (cqw units) and always fits on one line, whatever the screen.
  <div
    className={`min-w-0 rounded-2xl p-3.5 ${tone}`}
    style={{ containerType: "inline-size" }}
  >
    <div className="flex min-w-0 items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
        {icon}
      </div>

      <p
        className="whitespace-nowrap font-medium text-[#14226B]"
        style={{ fontSize: "clamp(10px, 6.2cqw, 13px)" }}
      >
        {label}
      </p>
    </div>

    <p
      className="mt-4 whitespace-nowrap text-center font-extrabold text-[#14226B]"
      style={{ fontSize: "clamp(15px, 9cqw, 21px)" }}
    >
      {value}
    </p>
  </div>
);

const WorkSummary: React.FC<{
  summary?: Summary;
  taskSummary?: TaskSummary;
  loading?: boolean;
  attendanceToday?: AttendanceToday;
}> = ({
  summary,
  taskSummary,
  attendanceToday,
}) => {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const checkedIn = Boolean(attendanceToday?.checkIn && !attendanceToday?.checkOut);
    if (!checkedIn) return;

    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [attendanceToday?.checkIn, attendanceToday?.checkOut]);

  const checkedIn = Boolean(attendanceToday?.checkIn && !attendanceToday?.checkOut);
  const liveWorkingMinutes = React.useMemo(() => {
    if (!checkedIn) return attendanceToday?.workingMinutes ?? summary?.totalWorkingMinutes ?? 0;

    const checkInMs = new Date(attendanceToday?.checkIn ?? 0).getTime();
    if (!Number.isFinite(checkInMs)) return attendanceToday?.workingMinutes ?? 0;

    const endMs = attendanceToday?.breakStart
      ? new Date(attendanceToday.breakStart).getTime()
      : now;

    return Math.max(
      0,
      (endMs - checkInMs) / 60000 - (attendanceToday?.breakMinutes ?? 0),
    );
  }, [attendanceToday, checkedIn, now, summary?.totalWorkingMinutes]);

  const liveOvertimeMinutes = Math.max(0, liveWorkingMinutes - 540);

  return (
    <section className={`${CARD} p-5`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardCheck size={24} className="text-[#1D4ED8]" />
          <h3 className="text-[22px] font-extrabold text-[#14226B]">Work Summary</h3>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-3 whitespace-nowrap rounded-xl border border-white/80 bg-white px-4 py-2.5 text-sm font-medium text-[#14226B] shadow-[0_4px_16px_rgba(37,70,170,0.08)]">
          <CalendarDays size={17} className="shrink-0 text-[#1D4ED8]" />
          <span>{formatDate(summary?.startDate)}</span>
          <span className="text-gray-400">–</span>
          <span>{formatDate(summary?.endDate)}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          tone="bg-[#E4ECFF]"
          icon={<CalendarDays size={18} className="text-[#1D4ED8]" />}
          label="Start Date"
          value={formatDate(summary?.startDate)}
        />

        <SummaryCard
          tone="bg-[#F0E4FF]"
          icon={<CalendarClock size={18} className="text-violet-600" />}
          label="End Date"
          value={formatDate(summary?.endDate)}
        />

        <SummaryCard
          tone="bg-[#DDF6E6]"
          icon={<Clock3 size={18} className="text-green-600" />}
          label="Total Working Hours"
          value={formatDuration(liveWorkingMinutes)}
        />

        <SummaryCard
          tone="bg-[#FFE9D6]"
          icon={<Hourglass size={18} className="text-orange-500" />}
          label="Total Overtime"
          value={formatDuration(liveOvertimeMinutes)}
        />

        <SummaryCard
          tone="bg-[#DDF6E6]"
          icon={<Check size={18} strokeWidth={3} className="text-emerald-600" />}
          label="Work Completed"
          value={taskSummary?.completed ?? summary?.tasksCompleted ?? 0}
        />
      </div>
    </section>
  );
};

export default WorkSummary;