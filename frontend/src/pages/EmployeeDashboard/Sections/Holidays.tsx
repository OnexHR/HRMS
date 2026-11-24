import React, { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import UpcomingHoliday from "../components/UpComingHoliday";
import HolidayNotice from "../components/HolidayNotice";
import AllHolidays from "../components/AllHolidays";
import Footer2 from "../../../components/Footer2";
import { toDayString, type Holiday } from "../../../lib/holidayUtils";
import employeeApi from "../../../lib/employeeApi";

// Turns whatever the API sends into the shape the components use.
// If your backend names a field differently, adjust it here only.
const normalise = (raw: any): Holiday | null => {
  const date = toDayString(raw.date ?? raw.holidayDate ?? raw.startDate);
  if (!date) return null;

  const status = String(raw.status ?? raw.state ?? "").toLowerCase();

  return {
    id: String(raw._id ?? raw.id ?? `${raw.name ?? raw.title}-${date}`),
    name: raw.name ?? raw.title ?? "Holiday",
    date,
    description: raw.description ?? raw.type ?? "",
    cancelled: raw.isCancelled === true || raw.cancelled === true || /cancel/.test(status),
    added: raw.isAdded === true || raw.isExtra === true || raw.added === true || status === "added" || status === "extra",
    note: raw.note ?? raw.reason ?? raw.message ?? undefined,
    noticeAt: raw.cancelledAt ?? raw.addedAt ?? raw.updatedAt ?? raw.createdAt ?? null,
  };
};

const DEMO_HOLIDAYS: Holiday[] = [
  {
    id: "diwali-2026",
    name: "Diwali",
    date: "2026-11-08",
    description: "Festival of Lights",
    cancelled: false,
    added: false,
  },
  {
    id: "christmas-2026",
    name: "Christmas Day",
    date: "2026-12-25",
    description: "National holiday",
    cancelled: false,
    added: false,
  },
  {
    id: "new-year-2027",
    name: "New Year's Day",
    date: "2027-01-01",
    description: "National holiday",
    cancelled: false,
    added: false,
  },
  {
    id: "republic-day-2027",
    name: "Republic Day",
    date: "2027-01-26",
    description: "National holiday",
    cancelled: false,
    added: false,
  },
  {
    id: "independence-day-2026",
    name: "Independence Day",
    date: "2026-08-15",
    description: "National holiday",
    cancelled: false,
    added: false,
  },
  {
    id: "gandhi-jayanti-2026",
    name: "Gandhi Jayanti",
    date: "2026-10-02",
    description: "National holiday",
    cancelled: false,
    added: false,
  },
];

const Holidays: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    employeeApi
      .get("/holidays")
      .then((res) => {
        const list: unknown = res.data?.holidays ?? res.data;
        if (!Array.isArray(list)) {
          throw new Error("Holidays API returned an invalid response.");
        }
        if (!mounted) return;
        const loaded = list.map(normalise).filter((holiday): holiday is Holiday => holiday !== null);
        setHolidays(loaded.length ? loaded : DEMO_HOLIDAYS);
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        console.error("Could not load holidays from the API; showing sample holiday data.", loadError);
        setHolidays(DEMO_HOLIDAYS);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#E6EDFF] via-[#EFF3FF] to-[#E3EAFF] text-gray-800">
      <Sidebar active="holidays" />

      <main className="ml-60 flex flex-1 flex-col">
        <Header hideBanner />

        <div className="flex-1 space-y-6 p-6 pt-5">
          <section className="relative flex min-h-[104px] shrink-0 items-center overflow-hidden rounded-2xl border border-[#B8C9EF] bg-gradient-to-r from-[#DCE7FF] via-[#E7EEFF] to-[#D5E2FF] px-6 py-3 shadow-[0_12px_30px_rgba(37,70,170,0.14)]">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-blue-300/20" />
            <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-blue-300/15" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#1D4ED8] shadow-sm">
                <CalendarDays size={25} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[24px] font-extrabold leading-tight text-[#14226B] sm:text-[26px]">
                  Holidays
                </h1>
                <p className="mt-1 text-[14px] font-medium text-[#1D2A78]">
                  View upcoming and past holidays, along with important notices.
                </p>
              </div>
            </div>
          </section>

          <UpcomingHoliday holidays={holidays} loading={loading} />
          <HolidayNotice holidays={holidays} />
          <AllHolidays holidays={holidays} loading={loading} />
        </div>

        <Footer2 />
      </main>
    </div>
  );
};

export default Holidays;