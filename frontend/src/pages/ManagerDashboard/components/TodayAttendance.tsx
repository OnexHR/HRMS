import React from "react";
import { Users2, CheckCircle2, Clock3, AlertTriangle } from "lucide-react";

import employeeApi from "../../../lib/employeeApi";
import type { TeamAttendanceStats } from "../../../types/Employee";

// How often the live attendance snapshot is re-fetched while the tab is visible.
const POLL_MS = 30_000;

const TodayAttendance: React.FC = () => {
  const [stats, setStats] = React.useState<TeamAttendanceStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setError(null);
        const res = await employeeApi.get<{ date: string; stats: TeamAttendanceStats }>(
          "/team/attendance/stats",
        );
        if (!active) return;
        setStats(res.data?.stats ?? null);
      } catch (err: any) {
        if (!active) return;
        setStats(null);
        setError(err.response?.data?.message || "Could not load attendance summary.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    // Attendance is live: poll so the counts follow members checking in, out or
    // going on break, and refresh immediately when the tab becomes visible
    // again. The timer idles while the tab is hidden.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    const timer = setInterval(onVisible, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const cards = [
    {
      label: "Total Employees",
      sub: "Assigned to you",
      value: loading ? "--" : stats?.total ?? 0,
      icon: Users2,
      bg: "bg-[#EEF3FB]",
      iconBg: "bg-white",
      iconColor: "text-[#2459A6]",
    },
    {
      label: "Present",
      sub: loading ? "--" : `${stats?.presentPct ?? 0}%`,
      value: loading ? "--" : stats?.present ?? 0,
      icon: CheckCircle2,
      bg: "bg-green-50",
      iconBg: "bg-white",
      iconColor: "text-green-600",
    },
    {
      label: "Late",
      sub: loading ? "--" : `${stats?.latePct ?? 0}%`,
      value: loading ? "--" : stats?.late ?? 0,
      icon: Clock3,
      bg: "bg-amber-50",
      iconBg: "bg-white",
      iconColor: "text-amber-500",
    },
    {
      label: "Absent",
      sub: loading ? "--" : `${stats?.absentPct ?? 0}%`,
      value: loading ? "--" : stats?.absent ?? 0,
      icon: AlertTriangle,
      bg: "bg-rose-50",
      iconBg: "bg-white",
      iconColor: "text-rose-500",
    },
  ];

  return (
    <section className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Users2 size={22} className="shrink-0 text-[#10284A]" />
        <h3 className="text-lg font-semibold text-[#10284A]">
          Today's Attendance
        </h3>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}

      {/* Two columns, not four: this panel is half the dashboard width, so four
          cards would leave ~120px each and wrap every label. */}
      <div className="mt-4 grid flex-1 grid-cols-2 content-center gap-3 sm:gap-4">
        {cards.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl p-4 ${stat.bg}`}
          >
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full ${stat.iconBg}`}
            >
              <stat.icon size={18} className={stat.iconColor} />
            </div>

            <p className="mt-3 truncate text-sm font-medium text-gray-600">
              {stat.label}
            </p>

            <p className="mt-1 text-2xl font-bold leading-tight text-[#10284A]">
              {stat.value}
            </p>

            <p className="mt-0.5 truncate text-xs text-gray-500">{stat.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TodayAttendance;
