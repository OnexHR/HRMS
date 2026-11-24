import React from "react";
import { Megaphone } from "lucide-react";
import { formatPlain, todayString, type Holiday } from "../../../lib/holidayUtils";

const noticeDate = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Warning-style updates: a holiday got cancelled, or an extra holiday was added.
// Only holidays that have not passed yet produce a notice, so old news drops off by itself.
// With nothing to report the whole section is hidden.
const HolidayNotice: React.FC<{ holidays: Holiday[] }> = ({ holidays }) => {
  const today = todayString();

  const notices = holidays
    .filter((h) => h.date >= today && (h.cancelled || h.added))
    .map((h) => ({ holiday: h, kind: h.cancelled ? ("cancelled" as const) : ("added" as const) }))
    .sort((a, b) => {
      const ta = a.holiday.noticeAt ? new Date(a.holiday.noticeAt).getTime() || 0 : 0;
      const tb = b.holiday.noticeAt ? new Date(b.holiday.noticeAt).getTime() || 0 : 0;
      return tb - ta || a.holiday.date.localeCompare(b.holiday.date);
    });

  return (
    <section className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E4ECFF] text-[#1D4ED8]">
          <Megaphone size={22} />
        </span>
        <div>
          <h3 className="text-[22px] font-extrabold text-[#14226B]">Holiday Updates</h3>
          <p className="text-sm text-slate-500">Recent additions and changes to the holiday calendar.</p>
        </div>
      </div>

      {notices.length === 0 ? (
        <p className="rounded-xl border border-blue-100 bg-[#F5F8FF] px-4 py-4 text-sm text-slate-500">
          No new holiday updates at this time.
        </p>
      ) : (
        <div className="space-y-3">
          {notices.map(({ holiday, kind }) => {
            const cancelled = kind === "cancelled";
            const date = noticeDate(holiday.noticeAt);

            return (
              <article
                key={`${kind}-${holiday.id}`}
                className={`flex items-center gap-4 overflow-hidden rounded-2xl border border-l-[5px] px-5 py-4 ${
                  cancelled
                    ? "border-rose-200 border-l-rose-600 bg-gradient-to-r from-[#FFE9EC] to-[#FFF1F3]"
                    : "border-green-200 border-l-green-600 bg-gradient-to-r from-[#E4F8EA] to-[#F0FBF3]"
                }`}
              >
                <Megaphone
                  size={30}
                  className={`-rotate-12 shrink-0 ${cancelled ? "fill-[#1D5BFF] text-[#1D5BFF]" : "fill-green-500 text-green-600"}`}
                />

                <div className="min-w-0 flex-1">
                  <h4 className="text-[18px] font-extrabold leading-tight text-[#14226B]">Holiday Notice</h4>
                  <p className="mt-0.5 text-sm text-[#1E2A63]">
                    {cancelled ? (
                      <>
                        {holiday.name} holiday on {formatPlain(holiday.date)} has been{" "}
                        <span className="font-bold text-rose-600">cancelled</span>.
                      </>
                    ) : (
                      <>
                        An extra holiday, {holiday.name}, on {formatPlain(holiday.date)} has been{" "}
                        <span className="font-bold text-green-700">added</span>.
                      </>
                    )}
                    {holiday.note ? <> {holiday.note}</> : null}
                  </p>
                </div>

                {date && (
                  <span
                    className={`flex shrink-0 items-center gap-2 rounded-full border bg-white px-4 py-1 text-sm font-medium ${
                      cancelled ? "border-rose-300 text-rose-600" : "border-green-300 text-green-700"
                    }`}
                  >
                    {date}
                    <span className={`h-2 w-2 rounded-full ${cancelled ? "bg-rose-500" : "bg-green-500"}`} />
                  </span>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default HolidayNotice;