import React from "react";
import { CalendarCheck2, CalendarDays, Star } from "lucide-react";
import { daysBetween, formatLong, stateOf, todayString, type Holiday } from "../../../lib/holidayUtils";

// The nearest upcoming holiday is always shown; any other one coming within this
// many days (for example a freshly added extra holiday) is shown with it.
const UPCOMING_WINDOW_DAYS = 30;

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const UpcomingHoliday: React.FC<{ holidays: Holiday[]; loading?: boolean }> = ({ holidays, loading }) => {
  const today = todayString();

  // Not passed and not cancelled, soonest first.
  const ahead = holidays
    .filter((h) => {
      const state = stateOf(h, today);
      return state === "upcoming" || state === "added";
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const shown = ahead.filter((h, i) => i === 0 || daysBetween(today, h.date) <= UPCOMING_WINDOW_DAYS);

  return (
    <section className={`${CARD} overflow-hidden`}>
      <div className="flex items-center justify-between border-b border-blue-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <CalendarDays size={26} className="text-[#1D4ED8]" />
          <h3 className="text-[22px] font-extrabold text-[#14226B]">Upcoming Holiday</h3>
        </div>

        <span className="rounded-full bg-[#DCE8FF] px-4 py-1 text-sm font-bold text-[#1D4ED8]">
          {shown.length} Upcoming
        </span>
      </div>

      {loading ? (
        <p className="px-6 py-6 text-sm text-gray-400">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="px-6 py-6 text-sm text-gray-500">No upcoming holidays.</p>
      ) : (
        <div className="divide-y divide-blue-50">
          {shown.map((holiday) => (
            <div key={holiday.id} className="flex items-center gap-5 px-6 py-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#E4ECFF] text-[#1D4ED8]">
                <CalendarDays size={28} strokeWidth={2} />
              </div>

              <div className="h-[72px] w-px shrink-0 bg-blue-100" />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h4 className="text-[22px] font-extrabold leading-tight text-[#14226B]">{holiday.name}</h4>
                  {holiday.added && (
                    <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-0.5 text-xs font-bold text-green-700">
                      <Star size={12} className="fill-green-600 text-green-600" />
                      Added
                    </span>
                  )}
                </div>

                <p className="mt-1.5 flex items-center gap-2 text-[15px] font-medium text-[#14226B]">
                  <CalendarDays size={16} />
                  {formatLong(holiday.date)}
                </p>
                {holiday.description && (
                  <p className="mt-1 flex items-center gap-2 text-[13px] text-[#1E2A63]">
                    <CalendarCheck2 size={15} />
                    {holiday.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default UpcomingHoliday;