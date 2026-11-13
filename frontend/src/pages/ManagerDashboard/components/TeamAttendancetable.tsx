import React, { useCallback, useEffect, useState } from "react";
import { Users2 } from "lucide-react";

import employeeApi from "../../../lib/employeeApi";
import type { TeamAttendanceRow } from "../../../types/Employee";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes?: number) {
  if (!minutes) return "-";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

const attendanceStyles: Record<string, string> = {
  Present: "bg-green-50 text-green-600",
  Late: "bg-amber-50 text-amber-600",
  Absent: "bg-rose-50 text-rose-600",
  Leave: "bg-blue-50 text-blue-600",
  Break: "bg-cyan-50 text-cyan-600",
  "On Call": "bg-violet-50 text-violet-600",
  Offline: "bg-gray-100 text-gray-500",
};

const activityDot: Record<string, string> = {
  Online: "bg-green-500",
  Break: "bg-amber-500",
  "On Call": "bg-violet-500",
  Offline: "bg-gray-400",
};

const activityText: Record<string, string> = {
  Online: "text-green-600",
  Break: "text-amber-600",
  "On Call": "text-violet-600",
  Offline: "text-gray-500",
};

const TABS = ["All", "Present", "Late", "Absent", "Leave", "Break", "On Call", "Offline"] as const;

// How often the live attendance snapshot is re-fetched while the tab is visible.
const POLL_MS = 30_000;

const TeamAttendanceTable: React.FC = () => {
  const [rows, setRows] = useState<TeamAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All");

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await employeeApi.get<{ date: string; rows: TeamAttendanceRow[] }>(
        "/team/attendance/rows",
      );
      setRows(res.data?.rows ?? []);
    } catch (err: any) {
      setRows([]);
      setError(err.response?.data?.message || "Could not load team attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Attendance is live: poll so a member checking out flips their Activity
    // cell to Offline without a manual reload, and refresh immediately when
    // the tab comes back. The timer idles while the tab is hidden.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    const timer = setInterval(onVisible, POLL_MS);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // "On Call" and "Offline" only ever appear in activity, while Present/Late/
  // Absent/Leave only appear in attendance, so a tab has to match either.
  const filtered =
    activeTab === "All"
      ? rows
      : rows.filter((r) => (r.attendance ?? "Absent") === activeTab || (r.activity ?? "Offline") === activeTab);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users2 size={20} className="text-[#10284A]" />
          <h3 className="text-lg font-semibold text-[#10284A]">
            Today's Team Attendance
          </h3>
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === tab
                ? "bg-[#2459A6] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-medium text-gray-400">
              <th className="pb-3 pr-4 font-medium">Employee</th>
              <th className="pb-3 pr-4 font-medium">Department</th>
              <th className="pb-3 pr-4 font-medium">Attendance</th>
              <th className="pb-3 pr-4 font-medium">Activity</th>
              <th className="pb-3 pr-4 font-medium">Check In</th>
              <th className="pb-3 pr-4 font-medium">Check Out</th>
              <th className="pb-3 font-medium">Working Hours</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-gray-400">
                  No team members found.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp._id} className="text-sm">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[#2459A6]">
                        {initialsOf(emp.name)}
                      </div>
                      <span className="font-medium text-[#10284A]">{emp.name}</span>
                    </div>
                  </td>

                  <td className="py-3 pr-4 text-gray-600">{emp.department || "-"}</td>

                  <td className="py-3 pr-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        attendanceStyles[emp.attendance ?? "Absent"] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {emp.attendance ?? "Absent"}
                    </span>
                  </td>

                  <td className="py-3 pr-4">
                    <span
                      className={`flex items-center gap-2 text-xs font-medium ${
                        activityText[emp.activity ?? "Offline"] ?? "text-gray-500"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${activityDot[emp.activity ?? "Offline"] ?? "bg-gray-400"}`} />
                      {emp.activity ?? "Offline"}
                    </span>
                  </td>

                  <td className="py-3 pr-4 text-gray-600">{formatTime(emp.checkIn)}</td>
                  <td className="py-3 pr-4 text-gray-600">{formatTime(emp.checkOut)}</td>
                  <td className="py-3 pr-4 text-gray-600">{formatDuration(emp.workingMinutes)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default TeamAttendanceTable;
