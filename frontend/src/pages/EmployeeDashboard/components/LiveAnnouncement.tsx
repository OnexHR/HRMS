import React from "react";
import { CalendarDays, Clock3, Megaphone } from "lucide-react";
import type { Announcement } from "./AllAnnouncement";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// The current announcement: the newest one that has not expired.
const LiveAnnouncement: React.FC<{ announcement?: Announcement | null; loading?: boolean }> = ({
  announcement,
  loading,
}) => {
  return (
    <section className="relative shrink-0 pt-5">
      {/* Tab label overlapping the card's top edge */}
      <span className="absolute left-2 top-0 z-10 rounded-xl bg-gradient-to-r from-[#0F2A7A] to-[#1B3FAF] px-6 py-2 text-[18px] font-extrabold text-white shadow-[0_6px_14px_rgba(15,42,122,0.2)]">
        Current Announcement
      </span>

      <div className="relative min-h-[190px] overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-r from-[#EAF0FF] via-[#EEF3FF] to-[#DCE7FF] px-7 pb-5 pt-12 shadow-[0_8px_24px_rgba(37,70,170,0.1)]">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-300/20" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-52 w-52 rounded-full bg-blue-300/15" />

        {loading ? (
          <p className="relative py-5 text-sm text-gray-500">Loading announcement...</p>
        ) : !announcement ? (
          <div className="relative flex items-center gap-4 py-2">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#D3E0FF] text-[#1D4ED8]">
              <Megaphone size={44} />
            </span>
            <p className="text-[16px] font-medium text-[#14226B]">There is no current announcement right now.</p>
          </div>
        ) : (
          <div className="relative flex min-h-[132px] items-center gap-6">
            {/* Illustration */}
            <div className="flex h-[132px] w-[160px] shrink-0 items-center justify-center border-r border-blue-200 pr-6">
              <span className="flex h-[132px] w-[132px] items-center justify-center rounded-full bg-[#D3E0FF]">
                <Megaphone size={64} strokeWidth={1.8} className="-rotate-12 fill-[#2F6BFF] text-[#1D4ED8]" />
              </span>
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1 self-center">
              <span className="inline-block rounded-full bg-[#4C8DFF] px-3.5 py-1 text-[13px] font-bold text-white">
                Current
              </span>

              <h3 className="mt-2 text-[22px] font-extrabold leading-tight text-[#14226B]">
                {announcement.title}
              </h3>

              <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#1E2A63]">
                {announcement.message}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-medium text-[#14226B]">
                <span className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  Published: {formatDate(announcement.publishedAt)}
                </span>
                <span className="text-gray-400">|</span>
                <span className="flex items-center gap-2">
                  <Clock3 size={16} />
                  Expires: {formatDate(announcement.expiresAt)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default LiveAnnouncement;