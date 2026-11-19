import React from "react";
import {
  BarChart3,
  ClipboardList,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Clock3,
  CheckCheck,
  CircleDashed,
  Hourglass,
  Users2,
  Timer,
} from "lucide-react";

type TodayWorkSummaryData = {
  totalTasks?: number;
  notStarted?: number;
  completed?: number;
  inProgress?: number;
  onHold?: number;
  pending?: number;
  workingMinutes?: number;
  breakMinutes?: number;
  overtimeMinutes?: number;
  meetingsCount?: number;
};

const formatMinutes = (minutes = 0) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.max(0, minutes % 60);
  return `${hours}h ${mins}m`;
};

const TodaysWorkSummary: React.FC<{ summary?: TodayWorkSummaryData }> = ({ summary }) => {
  const stats = [
    {
      label: "Total task",
      value: summary?.totalTasks ?? 0,
      icon: ClipboardList,
      bg: "bg-indigo-50",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "Not started",
      value: summary?.notStarted ?? 0,
      icon: CircleDashed,
      bg: "bg-slate-100",
      iconBg: "bg-slate-200",
      iconColor: "text-slate-600",
    },
    {
      label: "Pending",
      value: summary?.pending ?? 0,
      icon: Hourglass,
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "In progress",
      value: summary?.inProgress ?? 0,
      icon: PlayCircle,
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "On hold",
      value: summary?.onHold ?? 0,
      icon: PauseCircle,
      bg: "bg-violet-50",
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      label: "Completed",
      value: summary?.completed ?? 0,
      icon: CheckCircle2,
      bg: "bg-green-50",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
    {
      label: "Working hours",
      value: formatMinutes(summary?.workingMinutes ?? 0),
      icon: Clock3,
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      label: "Break time",
      value: formatMinutes(summary?.breakMinutes ?? 0),
      icon: CheckCheck,
      bg: "bg-cyan-50",
      iconBg: "bg-cyan-100",
      iconColor: "text-cyan-600",
    },
    {
      label: "Meetings",
      value: summary?.meetingsCount ?? 0,
      icon: Users2,
      bg: "bg-fuchsia-50",
      iconBg: "bg-fuchsia-100",
      iconColor: "text-fuchsia-600",
    },
    {
      label: "Overtime",
      value: formatMinutes(summary?.overtimeMinutes ?? 0),
      icon: Timer,
      bg: "bg-orange-50",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
        <BarChart3 size={20} className="text-[#2459A6]" />
        <h3 className="text-lg font-semibold text-[#10284A]">
          Today's Work Summary
        </h3>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className={`flex items-center gap-3 rounded-xl px-3.5 py-3 ${stat.bg}`}>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${stat.iconBg}`}>
              <stat.icon size={18} className={stat.iconColor} />
            </div>

            <div className="min-w-0">
              <p className="whitespace-nowrap text-[13px] font-medium leading-tight text-gray-600">
                {stat.label}
              </p>

              <p className="mt-0.5 whitespace-nowrap text-lg font-bold leading-tight text-[#10284A]">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TodaysWorkSummary;