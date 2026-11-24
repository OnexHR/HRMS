import React, { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CircleCheck,
  Coffee,
  ListChecks,
  LogIn,
  LogOut,
  Hourglass,
  Timer,
} from "lucide-react";
import { getDemoAttendanceMonth } from "../../../lib/employeeDashboardDemo";

type UiStatus = "Present" | "Half Day" | "Leave" | "Absent" | "Unknown";

type DayEntry = {
  status: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workingHours?: string;
  breakTime?: string;
  overtime?: string | null;
  tasksCompleted?: number;
  leaveType?: string;
};

const STATUS_MAP: Record<string, UiStatus> = {
  present: "Present",
  late: "Present",
  on_call: "Present",
  half_day: "Half Day",
  on_break: "Present",
  leave: "Leave",
  Leave: "Leave",
  absent: "Absent",
};

function toUiStatus(raw?: string): UiStatus {
  if (!raw) return "Absent";
  return STATUS_MAP[raw] ?? "Unknown";
}

function getStatusColor(status: UiStatus) {
  switch (status) {
    case "Present":
      return { dot: "bg-green-500", ring: "border-green-400 bg-white", halo: "bg-green-100", text: "text-green-600", badge: "bg-green-100 text-green-700" };
    case "Half Day":
      return { dot: "bg-yellow-400", ring: "border-yellow-400 bg-white", halo: "bg-yellow-100", text: "text-yellow-500", badge: "bg-yellow-100 text-yellow-700" };
    case "Leave":
      return { dot: "bg-blue-500", ring: "border-blue-400 bg-white", halo: "bg-blue-100", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" };
    default:
      return { dot: "bg-red-500", ring: "border-red-400 bg-white", halo: "bg-red-100", text: "text-red-500", badge: "bg-red-100 text-red-700" };
  }
}

// Sunday-first, like the design.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STANDARD_DAY_MINUTES = 540; // 9 hours — mirrors backend default
const HALF_DAY_MINUTES = STANDARD_DAY_MINUTES / 2;

function parseWorkingHours(value?: string): number {
  if (!value) return 0;
  const match = value.match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function liveWorkingMinutes(entry: DayEntry): number {
  if (entry.checkIn && !entry.checkOut) {
    const checkInMs = new Date(entry.checkIn).getTime();
    const breakMs = parseWorkingHours(entry.breakTime) * 60000;
    return Math.max(0, Math.floor((Date.now() - checkInMs - breakMs) / 60000));
  }
  return parseWorkingHours(entry.workingHours);
}

function uiStatusFor(entry: DayEntry | undefined): UiStatus {
  if (!entry) return "Absent";
  const minutes = liveWorkingMinutes(entry);
  if (minutes > 0 && minutes < HALF_DAY_MINUTES) return "Half Day";
  return toUiStatus(entry.status);
}

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const NavBtn: React.FC<{ onClick: () => void; children: React.ReactNode; label: string }> = ({
  onClick,
  children,
  label,
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#14226B] shadow-sm transition hover:bg-blue-50"
  >
    {children}
  </button>
);

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({
  icon,
  label,
  children,
}) => (
  <div className="flex items-center justify-between gap-3 py-2.5">
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E4ECFF] text-[#1D4ED8]">
        {icon}
      </span>
      <span className="text-sm font-medium text-[#14226B]">{label}</span>
    </div>
    <div className="text-sm font-bold text-[#14226B]">{children}</div>
  </div>
);

const AttendanceDetails: React.FC = () => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [dayMap, setDayMap] = useState<Record<string, DayEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  const load = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    try {
      setDayMap(getDemoAttendanceMonth(date).dayMap);
    } catch (demoError) {
      setDayMap({});
      setError(demoError instanceof Error ? demoError.message : "Could not load demo attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(viewDate);
    // Land on today when looking at the current month, otherwise nothing selected.
    const now = new Date();
    const sameMonth = now.getFullYear() === viewDate.getFullYear() && now.getMonth() === viewDate.getMonth();
    setSelectedDate(sameMonth ? now.getDate() : null);
  }, [viewDate, load]);

  // Refetch after check-in / check-out / break start / break end.
  useEffect(() => {
    const handleRefresh = () => load(viewDate);
    window.addEventListener("employee-attendance-status-change", handleRefresh);
    return () => window.removeEventListener("employee-attendance-status-change", handleRefresh);
  }, [viewDate, load]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay(); // Sunday-start
  const prevMonthDays = new Date(year, month, 0).getDate();
  const trailing = (7 - ((firstWeekday + daysInMonth) % 7)) % 7;

  const entryFor = (day: number): DayEntry | undefined => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dayMap[key];
  };

  const today = selectedDate ? entryFor(selectedDate) : undefined;
  const todayUiStatus = uiStatusFor(today);
  const todayColors = getStatusColor(todayUiStatus);

  const selectedLabel = selectedDate
    ? new Date(year, month, selectedDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No date selected";

  return (
    <section
      id="attendance-details"
      className="grid scroll-mt-6 grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
    >
      <div className={`${CARD} min-h-[470px] p-5`}>
        <div className="flex items-center gap-3">
          <CalendarDays size={24} className="text-[#1D4ED8]" />
          <h3 className="text-[22px] font-extrabold text-[#14226B]">Attendance Details</h3>
        </div>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-4 grid min-h-[390px] grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_210px]">
          <div className="min-w-0">
            <div className="flex items-center justify-between rounded-xl bg-[#EEF3FF] px-3 py-3">
              <div className="flex items-center gap-1.5">
                <NavBtn label="Previous year" onClick={() => setViewDate(new Date(year - 1, month, 1))}>
                  <ChevronsLeft size={16} />
                </NavBtn>
                <NavBtn label="Previous month" onClick={() => setViewDate(new Date(year, month - 1, 1))}>
                  <ChevronLeft size={16} />
                </NavBtn>
              </div>

              <h4 className="text-[19px] font-bold text-[#14226B]">
                {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h4>

              <div className="flex items-center gap-1.5">
                <NavBtn label="Next month" onClick={() => setViewDate(new Date(year, month + 1, 1))}>
                  <ChevronRight size={16} />
                </NavBtn>
                <NavBtn label="Next year" onClick={() => setViewDate(new Date(year + 1, month, 1))}>
                  <ChevronsRight size={16} />
                </NavBtn>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 text-center">
              {WEEKDAYS.map((day) => (
                <span key={day} className="text-[14px] font-semibold text-[#14226B]">
                  {day}
                </span>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-y-2 text-center">
              {Array.from({ length: firstWeekday }, (_, i) => (
                <div key={`prev-${i}`} className="flex h-14 items-start justify-center pt-2">
                  <span className="text-[15px] font-medium text-gray-300">
                    {prevMonthDays - firstWeekday + i + 1}
                  </span>
                </div>
              ))}

              {loading
                ? Array.from({ length: daysInMonth }, (_, i) => (
                    <div key={i} className="flex h-14 flex-col items-center justify-center">
                      <span className="text-[15px] text-gray-300">{i + 1}</span>
                    </div>
                  ))
                : Array.from({ length: daysInMonth }, (_, index) => {
                    const date = index + 1;
                    const entry = entryFor(date);
                    const uiStatus = uiStatusFor(entry);
                    const colors = getStatusColor(uiStatus);
                    const hasOvertime = Boolean(entry?.overtime);

                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className="flex h-14 flex-col items-center justify-center"
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center text-[15px] font-semibold transition ${
                            selectedDate === date
                              ? "employee-primary-action rounded-full"
                              : "rounded-full text-[#14226B] hover:bg-blue-50"
                          }`}
                        >
                          {date}
                        </span>

                        {entry ? (
                          <span
                            className={`mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full transition ${
                              hasOvertime ? `border-2 ${colors.ring}` : colors.halo
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                          </span>
                        ) : (
                          <span className="mt-0.5 h-2.5 w-2.5 rounded-full border border-gray-200 bg-gray-100" />
                        )}
                      </button>
                    );
                  })}

              {Array.from({ length: trailing }, (_, i) => (
                <div key={`next-${i}`} className="flex h-14 items-start justify-center pt-2">
                  <span className="text-[15px] font-medium text-gray-300">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-blue-100 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <h4 className="text-[19px] font-bold text-[#14226B]">Legend</h4>

            <div className="mt-5 space-y-4">
              {[
                { label: "Present", dot: "bg-green-500", bg: "bg-green-100" },
                { label: "Half Day", dot: "bg-yellow-400", bg: "bg-yellow-100" },
                { label: "Leave", dot: "bg-blue-500", bg: "bg-blue-100" },
                { label: "Absent", dot: "bg-red-500", bg: "bg-red-100" },
                { label: "No record", dot: "bg-gray-300", bg: "bg-gray-100" },
              ].map(({ label, dot, bg }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${bg}`}>
                    <span className={`h-3 w-3 rounded-full ${dot}`} />
                  </span>
                  <span className="text-[15px] text-gray-600">{label}</span>
                </div>
              ))}

              {[
                { label: "Present + Overtime", border: "border-green-400", bg: "bg-green-500" },
                { label: "Half Day + Overtime", border: "border-yellow-400", bg: "bg-yellow-400" },
                { label: "Leave + Overtime", border: "border-blue-400", bg: "bg-blue-500" },
                { label: "Absent + Overtime", border: "border-red-400", bg: "bg-red-500" },
              ].map(({ label, border, bg }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white ${border}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${bg}`} />
                  </span>
                  <span className="text-[15px] leading-tight text-gray-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`${CARD} flex h-full flex-col p-4`}>
        <h4 className="text-[18px] font-extrabold text-[#14226B]">Selected Day Details</h4>

        <div className="mt-4 rounded-xl bg-[#DDE8FF] py-3 text-center text-[17px] font-extrabold text-[#14226B]">
          {selectedLabel}
        </div>

        {!selectedDate ? (
          <p className="mt-5 text-sm text-gray-400">Pick a date on the calendar.</p>
        ) : (
          <div className="mt-2 flex flex-1 flex-col justify-between divide-y divide-blue-50">
            <DetailRow icon={<CircleCheck size={17} />} label="Status">
              <span className={`rounded-full px-4 py-1 text-xs font-bold ${todayColors.badge}`}>
                {todayUiStatus}
              </span>
            </DetailRow>

            <DetailRow icon={<LogIn size={16} />} label="Check In">
              {formatTime(today?.checkIn)}
            </DetailRow>

            <DetailRow icon={<LogOut size={16} />} label="Check Out">
              {formatTime(today?.checkOut)}
            </DetailRow>

            <DetailRow icon={<Timer size={17} />} label="Working Hours">
              {today?.workingHours ?? "0h 00m"}
            </DetailRow>

            <DetailRow icon={<Coffee size={16} />} label="Break Time">
              {today?.breakTime ?? "0m"}
            </DetailRow>

            <DetailRow icon={<Hourglass size={16} />} label="Overtime">
              {today?.overtime ?? "00h 00m"}
            </DetailRow>

            <DetailRow icon={<ListChecks size={17} />} label="Work Completed">
              {today?.tasksCompleted ?? 0}
            </DetailRow>
          </div>
        )}
      </div>
    </section>
  );
};

export default AttendanceDetails;