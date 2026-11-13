import React from "react";
import { CalendarDays, ExternalLink, UsersRound } from "lucide-react";

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

function formatDate(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function statusStyle(status: string) {
  switch (status) {
    case "ended":
      return "bg-red-50 text-red-600";
    case "active":
      return "bg-blue-50 text-blue-600";
    case "cancelled":
      return "bg-rose-50 text-rose-600";
    default:
      return "bg-amber-50 text-amber-600";
  }
}

const MeetingSummary: React.FC<{ meetings?: MeetingEntry[]; loading?: boolean }> = ({
  meetings,
  loading,
}) => {
  const items = meetings ?? [];

  return (
    <section className="flex h-[520px] flex-col rounded-2xl border border-gray-100 bg-white px-6 pb-8 pt-5 shadow-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <UsersRound
            size={20}
            className="text-[#10284A]"
          />

          <h3 className="text-lg font-semibold text-[#10284A]">
            Meeting Summary
          </h3>
        </div>
      </div>

      {/* Meetings */}
      {/* flex-1 + min-h-0: the list takes only the space left under the header,
          so it scrolls inside the card instead of spilling past it */}
      <div className="mt-4 min-h-0 flex-1 space-y-4 overflow-y-auto pr-5 [scrollbar-gutter:stable]">
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">No meetings scheduled.</p>
        ) : (
          items.map((meeting) => {
            const names = (meeting.participants ?? [])
              .map((p) => `${p.firstName} ${p.lastName}`)
              .join(", ");
            return (
              <div
                key={meeting._id}
                className="flex gap-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
              >
                {/* Calendar Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F8FC] text-[#2459A6]">
                  <CalendarDays size={19} />
                </div>

                {/* Meeting Information */}
                <div className="min-w-0 flex-1">
                  {/* Status + Time */}
                  <div className="flex flex-nowrap items-center gap-3 whitespace-nowrap">
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyle(meeting.status)}`}>
                      {meeting.status}
                    </span>

                    {/* Ended meetings show the actual duration here; others show the time range */}
                    {meeting.status === "ended" && meeting.actualDuration != null ? (
                      <>
                        <span className="shrink-0 text-xs font-medium text-red-600">
                          Actual duration: {formatDuration(meeting.actualDuration)}
                        </span>
                        {formatDate(meeting.actualStartedAt ?? meeting.startTime) && (
                          <span className="shrink-0 text-xs text-gray-500">
                            {formatDate(meeting.actualStartedAt ?? meeting.startTime)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="shrink-0 text-xs text-gray-500">
                        {formatRange(meeting.startTime, meeting.endTime)}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <p className="mt-2 text-sm font-semibold text-[#10284A]">
                    {meeting.title}
                  </p>

                  {/* Participants */}
                  {names && (
                    <p className="mt-1 text-xs text-gray-500">
                      With {names}
                    </p>
                  )}

                  {/* Expected duration + window */}
                  {meeting.expectedDuration ? (
                    <p className="mt-1 text-sm font-medium text-[#10284A]">
                      Expected duration: {meeting.expectedDuration} min
                      {meeting.expectedEndAt && meeting.actualStartedAt
                        ? ` (${formatRange(meeting.actualStartedAt, meeting.expectedEndAt)})`
                        : ""}
                    </p>
                  ) : meeting.durationMin ? (
                    <p className="mt-1 text-sm font-medium text-[#10284A]">
                      Duration: {meeting.durationMin} min
                    </p>
                  ) : null}

                  {/* Join link: disabled once the meeting has ended */}
                  {meeting.meetingLink ? (
                    meeting.status === "ended" ? (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="This meeting has ended"
                        className="mt-2 inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-[#2459A6] px-3 py-1.5 text-xs font-semibold text-white opacity-50"
                      >
                        <ExternalLink size={13} />
                        Join meeting
                      </button>
                    ) : (
                      <a
                        href={meeting.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#2459A6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1d4a8a]"
                      >
                        <ExternalLink size={13} />
                        Join meeting
                      </a>
                    )
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default MeetingSummary;