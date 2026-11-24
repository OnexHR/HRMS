import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleX,
  List,
  Search,
  Star,
} from "lucide-react";
import { formatWithWeekday, stateOf, todayString, type Holiday, type HolidayState } from "../../../lib/holidayUtils";
import StyledSelect from "./StyledSelect";

type Filter = "all" | "upcoming" | "passed" | "cancelled" | "added";

const PAGE_SIZE = 9;

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const TH = "px-5 py-3.5 text-left text-[14px] font-semibold text-[#14226B]";

// Cancelled: red badge + strike-through. Passed: grey badge + greyed row (no strike-through).
// Added: green badge. A holiday that is simply still ahead has no badge.
const Badge: React.FC<{ state: HolidayState }> = ({ state }) => {
  if (state === "cancelled") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-4 py-1 text-sm font-semibold text-rose-600">
        <CircleX size={16} className="fill-rose-600 text-white" />
        Cancelled
      </span>
    );
  }
  if (state === "passed") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-gray-200 px-4 py-1 text-sm font-semibold text-gray-500">
        <CircleCheck size={16} className="fill-gray-500 text-white" />
        Passed
      </span>
    );
  }
  if (state === "added") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1 text-sm font-semibold text-green-700">
        <Star size={15} className="fill-green-600 text-green-600" />
        Added
      </span>
    );
  }
  return null;
};

const AllHolidays: React.FC<{ holidays: Holiday[]; loading?: boolean }> = ({ holidays, loading }) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const today = todayString();

  // One list. Holidays still ahead come first (soonest first), then the ones
  // already gone (most recent first).
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    const withState = holidays
      .map((holiday) => ({ holiday, state: stateOf(holiday, today) }))
      .filter(({ holiday, state }) => {
        const matchesSearch =
          !q || holiday.name.toLowerCase().includes(q) || holiday.description.toLowerCase().includes(q);
        const matchesFilter =
          filter === "all" ||
          (filter === "upcoming" && (state === "upcoming" || state === "added")) ||
          filter === state;
        return matchesSearch && matchesFilter;
      });

    const ahead = withState
      .filter(({ holiday }) => holiday.date >= today)
      .sort((a, b) => a.holiday.date.localeCompare(b.holiday.date));
    const gone = withState
      .filter(({ holiday }) => holiday.date < today)
      .sort((a, b) => b.holiday.date.localeCompare(a.holiday.date));

    return [...ahead, ...gone];
  }, [holidays, search, filter, today]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1,
  );

  const pageBtn =
    "flex h-9 min-w-[38px] items-center justify-center rounded-lg border px-2 text-sm font-semibold transition";

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <List size={26} className="text-[#1D4ED8]" />
          <h3 className="text-[22px] font-extrabold text-[#14226B]">All Holidays</h3>
        </div>

        <div className="flex w-full min-w-0 items-center justify-end sm:flex-1">
          <label className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-full border border-[#C9D8F7] bg-white px-5 shadow-[0_6px_18px_rgba(37,70,170,0.10)] transition focus-within:border-[#1D5BFF] focus-within:ring-4 focus-within:ring-blue-100 sm:max-w-[384px]">
            <Search size={21} className="shrink-0 text-[#1D4ED8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search holidays..."
              className="w-full bg-transparent text-sm text-[#14226B] outline-none placeholder:text-[#8995AD]"
            />
          </label>

          <div className="ml-3 w-[164px] shrink-0">
            <StyledSelect
              value={filter}
              options={[
                { value: "all", label: "All" },
                { value: "upcoming", label: "Upcoming" },
                { value: "added", label: "Added" },
                { value: "cancelled", label: "Cancelled" },
                { value: "passed", label: "Passed" },
              ]}
              onChange={(value) => {
                setFilter(value as Filter);
                setPage(1);
              }}
              ariaLabel="Filter holidays"
              triggerClassName="h-[52px] rounded-full border-[#C9D8F7] bg-white px-5 text-base shadow-[0_6px_18px_rgba(37,70,170,0.10)]"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="bg-[#EAF0FF]">
              <th className={`${TH} rounded-l-lg`}>Date</th>
              <th className={TH}>Holiday Name</th>
              <th className={TH}>Description</th>
              <th className={`${TH} rounded-r-lg`}>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                  Loading holidays...
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                  {holidays.length === 0 ? "No holidays yet." : "No holidays match your search."}
                </td>
              </tr>
            ) : (
              pageRows.map(({ holiday, state }) => {
                const cancelled = state === "cancelled";
                const passed = state === "passed";

                // Passed: greyed only. Cancelled: struck through. Others: normal.
                const tone = passed ? "text-gray-400" : cancelled ? "text-gray-500" : "text-[#14226B]";
                const nameTone = passed ? "text-gray-500" : cancelled ? "text-gray-500" : "text-[#14226B]";
                const strike = cancelled ? "line-through" : "";

                return (
                  <tr key={holiday.id} className="border-b border-blue-100 last:border-b-0">
                    <td className={`px-5 py-4 text-[15px] ${tone} ${strike} ${!passed && !cancelled ? "font-bold" : ""}`}>
                      {formatWithWeekday(holiday.date)}
                    </td>
                    <td className={`px-5 py-4 text-[15px] font-semibold ${nameTone} ${strike}`}>{holiday.name}</td>
                    <td className={`px-5 py-4 text-[15px] ${passed || cancelled ? "text-gray-400" : "text-[#1E2A63]"} ${strike}`}>
                      {holiday.description || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <Badge state={state} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 && totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            className={`${pageBtn} border-blue-100 bg-white text-[#14226B] hover:bg-blue-50 disabled:opacity-40`}
          >
            <ChevronLeft size={16} />
          </button>

          {pageNumbers.map((n, i) => (
            <React.Fragment key={n}>
              {i > 0 && n - pageNumbers[i - 1] > 1 && <span className="px-1 text-gray-400">…</span>}
              <button
                type="button"
                onClick={() => setPage(n)}
                className={`${pageBtn} ${
                  n === currentPage
                    ? "employee-primary-action border-transparent"
                    : "border-blue-100 bg-white text-[#14226B] hover:bg-blue-50"
                }`}
              >
                {n}
              </button>
            </React.Fragment>
          ))}

          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
            className={`${pageBtn} border-blue-100 bg-white text-[#14226B] hover:bg-blue-50 disabled:opacity-40`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
};

export default AllHolidays;