import React from "react";
import { CalendarClock, ExternalLink, UsersRound, Video } from "lucide-react";

type MeetingPerson = { _id: string; firstName: string; lastName: string };
type MeetingEntry = {
  _id: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  durationMin?: number;
  meetingLink?: string;
  status: string;
  organizer?: MeetingPerson;
  participants?: MeetingPerson[];
  expectedDuration?: number;
  expectedEndAt?: string | null;
  actualDuration?: number;
  actualStartedAt?: string | null;
  actualEndedAt?: string | null;
};

function formatRange(start: string, end?: string | null) {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  const startStr = new Date(start).toLocaleTimeString([], opts);
  if (!end) return startStr;
  return `${startStr} - ${new Date(end).toLocaleTimeString([], opts)}`;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function dayWord(value: string) {
  const d = new Date(value);
  const now = new Date();
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (same(d, now)) return "Today";
  if (same(d, tomorrow)) return "Tomorrow";
  if (same(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusStyle(status: string) {
  switch (status) {
    case "ended":
      return "bg-green-100 text-green-700";
    case "active":
      return "bg-blue-100 text-blue-700";
    case "cancelled":
      return "bg-rose-100 text-rose-600";
    default:
      return "bg-green-100 text-green-700";
  }
}

// "scheduled" (and anything unknown) reads as an upcoming meeting.
function statusLabel(status: string) {
  switch (status) {
    case "ended":
      return "Ended";
    case "active":
      return "In Progress";
    case "cancelled":
      return "Cancelled";
    default:
      return "Upcoming Meeting";
  }
}

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

// Small flat calendar + person illustration shown on each meeting card.
const MeetingIllustration: React.FC = () => (
  <svg viewBox="0 0 120 110" className="h-full w-full" aria-hidden="true">
    <circle cx="62" cy="58" r="46" fill="#E4ECFF" />
    <rect x="52" y="22" width="52" height="50" rx="8" fill="#fff" stroke="#C7D6F7" strokeWidth="2" />
    <rect x="52" y="22" width="52" height="13" rx="8" fill="#3B82F6" />
    <g fill="#C7D6F7">
      <rect x="60" y="42" width="8" height="7" rx="2" />
      <rect x="74" y="42" width="8" height="7" rx="2" />
      <rect x="88" y="42" width="8" height="7" rx="2" />
      <rect x="60" y="54" width="8" height="7" rx="2" />
      <rect x="74" y="54" width="8" height="7" rx="2" />
    </g>
    <circle cx="96" cy="70" r="14" fill="#fff" stroke="#3B82F6" strokeWidth="3" />
    <path d="M96 62 V70 L102 74" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" fill="none" />
    <circle cx="36" cy="56" r="10" fill="#F4B98C" />
    <path d="M26 53 C 27 44, 45 44, 46 53 C 40 49, 32 49, 26 53Z" fill="#1F2A56" />
    <rect x="22" y="66" width="28" height="30" rx="10" fill="#2563EB" />
  </svg>
);

const MeetingSummary: React.FC<{ meetings?: MeetingEntry[]; loading?: boolean }> = ({
  meetings,
  loading,
}) => {
  const items = meetings ?? [];

  return (
    <section className={`${CARD} flex h-[520px] flex-col px-5 pb-6 pt-5`}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3">
        <Video size={24} className="text-[#1D4ED8]" />
        <h3 className="text-[22px] font-extrabold text-[#14226B]">Meeting Summary</h3>
      </div>

      {/* Meetings: flex-1 + min-h-0 so the list scrolls inside the card */}
      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-3 [scrollbar-gutter:stable]">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">No meetings scheduled.</p>
        ) : (
          items.map((meeting) => {
            const people = meeting.participants ?? [];
            const names = people.map((p) => `${p.firstName} ${p.lastName}`).join(", ");
            return (
              <div
                key={meeting._id}
                className="relative overflow-hidden rounded-2xl border border-blue-50 bg-gradient-to-br from-white to-[#F3F7FF] p-4"
              >
                <div className="flex gap-3">
                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <span
                      className={`inline-block rounded-full px-3.5 py-1 text-[12px] font-bold ${statusStyle(meeting.status)}`}
                    >
                      {statusLabel(meeting.status)}
                    </span>

                    <p className="mt-3 text-[19px] font-extrabold leading-snug text-[#14226B]">
                      {meeting.title}
                    </p>

                    <div className="mt-2.5 space-y-2 text-[14px] text-[#14226B]">
                      <p className="flex items-center gap-2.5">
                        <CalendarClock size={17} className="shrink-0 text-[#1D4ED8]" />
                        {dayWord(meeting.startTime)}, {formatRange(meeting.startTime, meeting.endTime)}
                      </p>

                      {people.length > 0 && (
                        <p className="flex items-center gap-2.5" title={names}>
                          <UsersRound size={17} className="shrink-0 text-[#1D4ED8]" />
                          {people.length} {people.length === 1 ? "Participant" : "Participants"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Illustration */}
                  <div className="hidden h-[110px] w-[120px] shrink-0 sm:block">
                    <MeetingIllustration />
                  </div>
                </div>

                {names && (
                  <p className="mt-2 text-xs text-gray-500">With {names}</p>
                )}

                <div className="mt-3 border-t border-blue-100 pt-3 text-[13px] font-medium text-[#14226B]">
                  {/* Expected duration + window */}
                  {meeting.expectedDuration ? (
                    <span>
                      Expected Duration: {meeting.expectedDuration} mins
                      {meeting.expectedEndAt && meeting.actualStartedAt
                        ? ` (${formatRange(meeting.actualStartedAt, meeting.expectedEndAt)})`
                        : ""}
                    </span>
                  ) : meeting.durationMin ? (
                    <span>Duration: {meeting.durationMin} mins</span>
                  ) : null}

                  {/* Actual duration (after meeting ends) */}
                  {meeting.status === "ended" && meeting.actualDuration != null ? (
                    <span className="text-green-700">
                      {meeting.expectedDuration || meeting.durationMin ? " | " : ""}
                      Actual Duration: {formatDuration(meeting.actualDuration)}
                    </span>
                  ) : meeting.expectedDuration ? (
                    <span> | Actual Duration: --</span>
                  ) : null}
                </div>

                {/* Join link */}
                {meeting.meetingLink ? (
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="employee-primary-action mt-3 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition"
                  >
                    <ExternalLink size={16} />
                    Join Meeting
                  </a>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default MeetingSummary;