import React from "react";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  Check,
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
  const total = minutes ?? 0;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
}

// Every card shares this layout, so icon + label always sit side by side on one
// line and the value goes underneath. Previously one card had a different
// structure, which is why its label overlapped the card edge.
const SummaryCard: React.FC<{
  icon: React.ReactNode;
  tone: string;
  iconBg: string;
  label: string;
  value: React.ReactNode;
}> = ({ icon, tone, iconBg, label, value }) => (
  // The card is a CSS size container, so the label font scales with the card's
  // own width (cqw units) and always fits on one line, whatever the screen.
  <div
    className={`min-w-0 rounded-xl border p-3 ${tone}`}
    style={{ containerType: "inline-size" }}
  >
    <div className="flex min-w-0 items-center gap-1.5">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}
      >
        {icon}
      </div>

      <p
        className="whitespace-nowrap font-medium text-gray-500"
        style={{ fontSize: "clamp(10px, 6.2cqw, 13px)" }}
      >
        {label}
      </p>
    </div>

    <p
      className="mt-4 whitespace-nowrap text-center font-bold text-[#10284A]"
      style={{ fontSize: "clamp(15px, 9cqw, 21px)" }}
    >
      {value}
    </p>
  </div>
);

const WorkSummary: React.FC<{ summary?: Summary; taskSummary?: TaskSummary; loading?: boolean }> = ({
  summary,
  taskSummary,
}) => {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <BarChart3 size={21} className="text-[#2459A6]" />
          </div>

          <h3 className="text-xl font-semibold text-[#10284A]">Work Summary</h3>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-3 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 shadow-sm">
          <CalendarDays size={18} className="shrink-0 text-[#2459A6]" />

          <span>{formatDate(summary?.startDate)}</span>

          <span className="text-gray-400">−</span>

          <span>{formatDate(summary?.endDate)}</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-5 grid grid-cols-5 gap-2">
        <SummaryCard
          tone="border-blue-100 bg-blue-50"
          iconBg="bg-white"
          icon={<CalendarDays size={18} className="text-[#2459A6]" />}
          label="Start Date"
          value={formatDate(summary?.startDate)}
        />

        <SummaryCard
          tone="border-violet-100 bg-violet-50"
          iconBg="bg-white"
          icon={<CalendarDays size={18} className="text-violet-600" />}
          label="End Date"
          value={formatDate(summary?.endDate)}
        />

        <SummaryCard
          tone="border-green-100 bg-green-50"
          iconBg="bg-white"
          icon={<Clock3 size={18} className="text-green-600" />}
          label="Total Working Hours"
          value={formatDuration(summary?.totalWorkingMinutes)}
        />

        <SummaryCard
          tone="border-orange-100 bg-orange-50"
          iconBg="bg-white"
          icon={<Clock3 size={18} className="text-orange-600" />}
          label="Total Overtime"
          value={formatDuration(summary?.totalOvertimeMinutes)}
        />

        <SummaryCard
          tone="border-emerald-100 bg-emerald-50"
          iconBg="bg-white"
          icon={<Check size={18} className="text-emerald-600" />}
          label="Tasks Completed"
          value={taskSummary?.completed ?? summary?.tasksCompleted ?? 0}
        />
      </div>
    </section>
  );
};

export default WorkSummary;