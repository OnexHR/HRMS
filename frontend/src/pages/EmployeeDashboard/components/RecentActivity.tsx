import React from "react";
import { Clock } from "lucide-react";

type ActivityEntry = { type: string; at: string; meta?: any };

type Category = { label: string; pill: string };

const CAT: Record<string, Category> = {
  attendance: { label: "Attendance", pill: "bg-green-100 text-green-700" },
  break: { label: "Break", pill: "bg-blue-100 text-blue-700" },
  meeting: { label: "Meeting", pill: "bg-purple-100 text-purple-700" },
  task: { label: "Work", pill: "bg-green-100 text-green-700" },
  leave: { label: "Leave", pill: "bg-amber-100 text-amber-700" },
  query: { label: "Query", pill: "bg-rose-100 text-rose-600" },
  profile: { label: "Profile", pill: "bg-gray-100 text-gray-600" },
};

const ACTIVITY_LABELS: Record<string, { text: string; category: Category; status?: string }> = {
  checkin: { text: "Checked in", category: CAT.attendance, status: "Online" },
  checkout: { text: "Checked out", category: CAT.attendance },
  break_start: { text: "Break started", category: CAT.break },
  break_end: { text: "Break ended", category: CAT.break },
  meeting_start: { text: "Meeting started", category: CAT.meeting },
  meeting_end: { text: "Meeting ended", category: CAT.meeting, status: "Back online" },
  task_assigned: { text: "New work assigned", category: CAT.task },
  task_completed: { text: "Work completed", category: CAT.task },
  profile_updated: { text: "Profile updated", category: CAT.profile },
  leave_submitted: { text: "Leave requested", category: CAT.leave },
  leave_approved: { text: "Leave approved", category: CAT.leave },
  leave_rejected: { text: "Leave rejected", category: CAT.leave },
  query_raised: { text: "Query raised", category: CAT.query },
  query_reviewed: { text: "Query reviewed", category: CAT.query },
};

// Extra text shown after the label, e.g. "New task assigned · by Surjya Paul".
// Reads meta.title (or taskTitle) and meta.assignedBy (a name string or a
// {firstName, lastName} object), so it works for task_assigned / task_completed
// and any other event that carries a title.
function detailFor(type: string, meta: any): string {
  if (!meta) return "";
  const title = meta.title ?? meta.taskTitle ?? meta.detail ?? "";
  const by = meta.assignedBy;
  const byName =
    typeof by === "string"
      ? by
      : by && (by.firstName || by.lastName)
        ? `${by.firstName ?? ""} ${by.lastName ?? ""}`.trim()
        : "";
  // New task assigned: show only who assigned it, not the task title.
  if (type === "task_assigned") return byName ? `by ${byName}` : "";
  if (title && byName) return `${title} — by ${byName}`;
  return title || (byName ? `by ${byName}` : "");
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Convert snake_case event types like "employee_created" to readable labels.
function readableLabel(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Local-calendar key (YYYY-MM-DD), so "Today"/"Yesterday" follow the
// employee's own day rather than UTC.
function dayKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Computed from the current date on every render, so "Today" / "Yesterday"
// roll over by themselves each day; older days show the actual date.
function dayLabel(d: Date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const key = dayKey(d);
  if (key === dayKey(now)) return "Today";
  if (key === dayKey(yesterday)) return "Yesterday";

  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const RecentActivity: React.FC<{ activities?: ActivityEntry[]; loading?: boolean }> = ({
  activities,
  loading,
}) => {
  // Newest first.
  const items = [...(activities ?? [])]
    .filter((a) => !Number.isNaN(new Date(a.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <section className={`${CARD} flex h-[520px] flex-col px-5 pb-6 pt-5`}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clock size={24} className="text-[#1D4ED8]" />
        <h3 className="text-[22px] font-extrabold text-[#14226B]">Recent activity</h3>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-3 [scrollbar-gutter:stable]">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activity.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute bottom-3 left-[6px] top-3 w-px bg-slate-300" />

            <div className="flex flex-col">
              {items.map((activity, index) => {
                const meta = ACTIVITY_LABELS[activity.type] || {
                  text: readableLabel(activity.type),
                  category: { label: "Activity", pill: "bg-gray-100 text-gray-600" },
                };
                const detail = detailFor(activity.type, activity.meta);
                const when = new Date(activity.at);

                return (
                  <div
                    key={`${activity.type}-${activity.at}-${index}`}
                    className="relative flex items-start gap-4 border-b border-blue-50 py-3.5 last:border-b-0"
                  >
                    {/* Timeline dot */}
                    <span className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-slate-500 shadow-sm" />

                    {/* Text */}
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-nowrap text-[13px] text-gray-500">
                        {dayLabel(when)}, {formatTime(activity.at)}
                      </p>
                      <p className="mt-0.5 text-[15px] font-bold leading-snug text-[#14226B]">
                        {meta.text}
                        {detail && (
                          <span className="ml-1.5 font-medium text-gray-500">· {detail}</span>
                        )}
                      </p>
                    </div>

                    {/* Badges */}
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span
                        className={`rounded-full px-3.5 py-1 text-[12px] font-semibold leading-none ${meta.category.pill}`}
                      >
                        {meta.category.label}
                      </span>
                      {meta.status && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold leading-none text-green-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          {meta.status}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default RecentActivity;