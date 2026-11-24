import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Clock3,
  Coffee,
  LogIn,
  LogOut,
  Play,
  UsersRound,
} from "lucide-react";
import {
  applyDemoAttendanceAction,
  type DemoAttendanceAction,
} from "../../../lib/employeeDashboardDemo";
import type { AttendanceToday } from "../../../types/Employee";
import MeetingDialog from "../../../components/MeetingDialog";

const EMPLOYEE_ATTENDANCE_KEY = "employee_attendance_status";
const EMPLOYEE_ATTENDANCE_EVENT = "employee-attendance-status-change";

const updateStoredAttendanceStatus = (status: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(EMPLOYEE_ATTENDANCE_KEY, status);
  window.dispatchEvent(new Event(EMPLOYEE_ATTENDANCE_EVENT));
};

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(minutes?: number) {
  const total = Math.floor(minutes ?? 0);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${m}m`;
}

// "00h 00m" style, zero-padded so the big number does not jump around.
function formatHM(minutes: number) {
  const total = Math.max(0, Math.floor(minutes));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(total / 60))}h ${pad(total % 60)}m`;
}

function formatHMS(minutes: number) {
  const totalSeconds = Math.max(0, Math.floor(minutes * 60));
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

// True once the window is at least `px` wide. Used for the 3-column layout so it does not
// depend on any Tailwind breakpoint class being generated.
function useMinWidth(px: number) {
  const query = `(min-width: ${px}px)`;
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/* ------------------------------------------------------------------ */
/* 12-hour clock ring                                                  */
/* ------------------------------------------------------------------ */
// The ring follows a standard 12-hour clock: 12 at the top, 3 on the right,
// 6 at the bottom and 9 on the left. A clock hand repeats every 12 hours.
//   red    = late / not logged in (9:00 AM until check-in; full red if the whole
//            working day passes with no check-in)
//   green  = working, from check-in up to 5:00 PM (stops at check-out)
//   yellow = overtime, after 5:00 PM (or the part of a session that runs past midnight)
const DAY_MIN = 24 * 60;
const DIAL_MIN = 12 * 60;
const WORK_START = 9 * 60; // 9:00 AM
const WORK_END = 17 * 60; // 5:00 PM

type SegmentColor = "red" | "green" | "yellow";
type Segment = { from: number; to: number; color: SegmentColor };

const SEGMENT_STROKE: Record<SegmentColor, string> = {
  red: "#EF4444",
  green: "#22C55E",
  yellow: "#FACC15",
};

const minutesIntoDay = (d: Date) => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function buildSegments(checkIn?: string | null, checkOut?: string | null, nowMs: number = Date.now()): Segment[] {
  const now = new Date(nowMs);
  const nowMin = minutesIntoDay(now);

  const ci = checkIn ? new Date(checkIn) : null;
  const co = checkOut ? new Date(checkOut) : null;
  const ciOk = ci !== null && !Number.isNaN(ci.getTime());
  const coOk = co !== null && !Number.isNaN(co.getTime());

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  // Where the session ends on today's dial: check-out time, or "now" while still on the clock.
  // A check-out that happened on an earlier day means there is no session today.
  let end: number | null = nowMin;
  if (coOk) end = sameDay(co as Date, now) ? minutesIntoDay(co as Date) : null;

  const segments: Segment[] = [];

  // Check-in was yesterday (or earlier) and the session is still running (or ended today):
  // the ring has reset at 12 AM, the rest of the session is overtime from the start of the dial.
  if (ciOk && (ci as Date).getTime() < startOfToday && end !== null) {
    if (end > 0) segments.push({ from: 0, to: end, color: "yellow" });
    return segments;
  }

  // Checked in today.
  if (ciOk && sameDay(ci as Date, now) && end !== null) {
    const start = minutesIntoDay(ci as Date);

    // Late: 9:00 AM until the moment of check-in (capped at the end of working hours).
    if (start > WORK_START) {
      segments.push({ from: WORK_START, to: Math.min(start, WORK_END), color: "red" });
    }

    // Working: check-in until 5:00 PM, stopping at check-out.
    if (start < WORK_END && end > start) {
      segments.push({ from: start, to: Math.min(end, WORK_END), color: "green" });
    }

    // Overtime: anything after 5:00 PM.
    if (end > WORK_END) {
      segments.push({ from: Math.max(start, WORK_END), to: end, color: "yellow" });
    }

    return segments;
  }

  // Not logged in today: red grows from 9:00 AM; once the working day is over it is a full red ring.
  if (nowMin >= WORK_END) return [{ from: 0, to: DAY_MIN, color: "red" }];
  if (nowMin > WORK_START) segments.push({ from: WORK_START, to: nowMin, color: "red" });
  return segments;
}

const RING_CENTER = 100;
const RING_RADIUS = 78;
const RING_WIDTH = 13;

const polar = (minutes: number, radius: number) => {
  const clockMinutes = ((minutes % DIAL_MIN) + DIAL_MIN) % DIAL_MIN;
  const angle = (clockMinutes / DIAL_MIN) * 2 * Math.PI - Math.PI / 2;
  return { x: RING_CENTER + radius * Math.cos(angle), y: RING_CENTER + radius * Math.sin(angle) };
};

const arcPath = (from: number, to: number) => {
  const a = polar(from, RING_RADIUS);
  const b = polar(to, RING_RADIUS);
  const fromDial = ((from % DIAL_MIN) + DIAL_MIN) % DIAL_MIN;
  const toDial = ((to % DIAL_MIN) + DIAL_MIN) % DIAL_MIN;
  const clockwiseDistance = (toDial - fromDial + DIAL_MIN) % DIAL_MIN;
  const large = clockwiseDistance > DIAL_MIN / 2 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${RING_RADIUS} ${RING_RADIUS} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
};

const DayRing: React.FC<{ segments: Segment[]; nowMin: number; size: number }> = ({ segments, nowMin, size }) => {
  const marker = polar(nowMin, RING_RADIUS);

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className="absolute left-0 top-0" aria-hidden="true">
      {/* outer thin ring */}
      <circle cx={RING_CENTER} cy={RING_CENTER} r={93} fill="none" stroke="#BFD0F5" strokeWidth={1.5} strokeDasharray="2 5" />

      {/* track */}
      <circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} fill="none" stroke="#DCE6FF" strokeWidth={RING_WIDTH} />

      {/* coloured segments */}
      {segments.map((seg, i) =>
        seg.to - seg.from < 0.1 ? null : seg.to - seg.from >= DAY_MIN - 0.1 ? (
          <circle
            key={i}
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            fill="none"
            stroke={SEGMENT_STROKE[seg.color]}
            strokeWidth={RING_WIDTH}
          />
        ) : (
          <path
            key={i}
            d={arcPath(seg.from, seg.to)}
            fill="none"
            stroke={SEGMENT_STROKE[seg.color]}
            strokeWidth={RING_WIDTH}
          />
        ),
      )}

      {/* Standard 12-hour dial labels */}
      {[
        { label: "12", m: 0 },
        { label: "3", m: 180 },
        { label: "6", m: 360 },
        { label: "9", m: 540 },
      ].map(({ label, m }) => {
        const p = polar(m, 93);
        return (
          <text
            key={label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#7382A6"
            fontSize="10"
            fontWeight="700"
          >
            {label}
          </text>
        );
      })}

      {/* "now" marker */}
      <circle cx={marker.x} cy={marker.y} r={6.5} fill="#fff" stroke="#14226B" strokeWidth={2.5} />
    </svg>
  );
};

/* ------------------------------------------------------------------ */

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const RING_SIZE = 150;
const DIVIDER = "1px solid #DBE5FB";

// Check In / Check Out tile.
const TimeTile: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="min-w-0 rounded-xl border border-blue-100 bg-white/90 px-4 py-2.5 shadow-sm">
    <div className="flex items-center gap-2 text-[#14226B]">
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap text-[13px] font-semibold">{label}</span>
    </div>
    <p className="mt-0.5 whitespace-nowrap pl-[26px] text-[18px] font-extrabold tabular-nums leading-tight text-[#14226B]">
      {value}
    </p>
  </div>
);

// Bottom strip stat.
const StripStat: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  divider?: boolean;
}> = ({ icon, label, value, valueClass = "text-[#14226B]", divider }) => (
  <div
    className="flex min-w-0 items-center justify-center gap-3 px-3"
    style={divider ? { borderLeft: DIVIDER } : undefined}
  >
    <span className="shrink-0 text-[#1D4ED8]">{icon}</span>
    <div className="min-w-0 leading-tight">
      <p className="whitespace-nowrap text-[13px] font-medium text-gray-500">{label}</p>
      <p className={`mt-0.5 whitespace-nowrap text-[18px] font-extrabold ${valueClass}`}>{value}</p>
    </div>
  </div>
);

const TodayAttendance: React.FC<{
  attendanceToday?: AttendanceToday;
  loading?: boolean;
  onRefresh: () => void | Promise<void>;
  onLeaveRequest: () => void;
}> = ({ attendanceToday, loading, onRefresh, onLeaveRequest }) => {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMeeting, setShowMeeting] = useState(false);

  // Three columns side by side once there is room, stacked below that.
  const wide = useMinWidth(1100);

  const status = attendanceToday?.status;
  const checkedIn = Boolean(attendanceToday?.checkIn && !attendanceToday?.checkOut);
  const onBreak = status === "on_break";

  // Ticks every second while on the clock; once a minute otherwise, which is enough to
  // keep the clock, the late (red) arc and the "now" marker moving on an idle dashboard.
  const [now, setNow] = useState(() => Date.now());
  const liveCounterRef = useRef({ checkIn: null as string | null, minutes: 0 });

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Mirrors liveWorkingMinutes() on the server: persisted once checked out,
  // otherwise measured from check-in, with completed breaks deducted and an
  // in-progress break acting as the end of the window so the clock pauses.
  const liveWorkingMinutesRaw = useMemo(() => {
    const persisted = attendanceToday?.workingMinutes ?? 0;
    if (!checkedIn) return persisted;

    const checkInMs = new Date(attendanceToday?.checkIn ?? 0).getTime();
    if (Number.isNaN(checkInMs)) return persisted;

    const endMs = attendanceToday?.breakStart
      ? new Date(attendanceToday.breakStart).getTime()
      : now;

    return Math.max(0, (endMs - checkInMs) / 60000 - (attendanceToday?.breakMinutes ?? 0));
  }, [attendanceToday, checkedIn, now]);

  const liveWorkingMinutes = useMemo(() => {
    const checkInKey = attendanceToday?.checkIn ?? null;
    if (liveCounterRef.current.checkIn !== checkInKey) {
      liveCounterRef.current = { checkIn: checkInKey, minutes: liveWorkingMinutesRaw };
      return liveWorkingMinutesRaw;
    }

    if (!onBreak && liveWorkingMinutesRaw < liveCounterRef.current.minutes) {
      return liveCounterRef.current.minutes;
    }

    liveCounterRef.current.minutes = liveWorkingMinutesRaw;
    return liveWorkingMinutesRaw;
  }, [attendanceToday?.checkIn, liveWorkingMinutesRaw, onBreak]);

  // Ring colours follow check-in / check-out against the 9 AM - 5 PM window.
  const segments = useMemo(
    () => buildSegments(attendanceToday?.checkIn, attendanceToday?.checkOut, now),
    [attendanceToday?.checkIn, attendanceToday?.checkOut, now],
  );
  const nowMin = minutesIntoDay(new Date(now));

  const runAction = async (action: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const submitAttendanceAction = async (demoAction: DemoAttendanceAction, storedStatus: string) => {
    applyDemoAttendanceAction(demoAction);
    updateStoredAttendanceStatus(storedStatus);
  };

  const handleCheckIn = () =>
    runAction(() => submitAttendanceAction("check-in", "online"));

  const handleCheckOut = () =>
    runAction(() => submitAttendanceAction("check-out", "offline"));

  const handleBreakStart = () =>
    runAction(() => submitAttendanceAction("break-start", "on_break"));

  const handleBreakEnd = () =>
    runAction(() => submitAttendanceAction("break-end", "online"));

  const dutyLabel = onBreak ? "On Break" : checkedIn ? "On Duty" : "Off Duty";
  const dutyColor = onBreak ? "text-amber-600" : checkedIn ? "text-green-600" : "text-gray-500";

  // The "Live" chip next to Live Working Hours.
  const liveChip = onBreak
    ? { text: "On Break", cls: "bg-amber-100 text-amber-700" }
    : checkedIn
      ? { text: "Live", cls: "bg-green-100 text-green-700" }
      : { text: "Not live", cls: "bg-gray-100 text-gray-500" };

  const clockText = new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  const [clockTime, clockPeriod] = clockText.split(" ");
  const dateText = new Date(now).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const actionBtn = "flex min-w-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-xl px-3 text-[15px] font-semibold transition";

  return (
    <section className={`${CARD} p-4`}>
      {/* Header: title on the left, colour legend + leave shortcut on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarCheck size={24} strokeWidth={2} className="text-[#1D4ED8]" />
          <h3 className="text-[22px] font-extrabold text-[#14226B]">Today's Attendance</h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={onLeaveRequest}
            className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-blue-200 bg-white/90 px-3 py-1.5 text-[13px] font-semibold text-[#14226B] shadow-sm transition hover:bg-blue-50"
          >
            <CalendarDays size={15} className="text-[#1D4ED8]" />
            Leave Request
          </button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
          {actionError}
        </p>
      )}

      {/* Main content: ring | live hours | actions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: wide ? "250px minmax(0, 1fr) 220px" : "1fr",
          gap: wide ? 0 : 16,
          alignItems: "stretch",
          marginTop: 12,
        }}
      >
        {/* LEFT: 24-hour ring with the current time */}
        <div
          className="relative flex items-center justify-center"
          style={wide ? { borderRight: DIVIDER, paddingRight: 16 } : undefined}
        >
          {wide && (
            <div className="absolute bottom-[-10px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-md bg-white/95 px-2 py-1 text-[9px] font-semibold text-[#14226B]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Late
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Working
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-yellow-400" /> Overtime
              </span>
            </div>
          )}
          <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
            <DayRing segments={segments} nowMin={nowMin} size={RING_SIZE} />

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="whitespace-nowrap text-[24px] font-extrabold leading-none tabular-nums text-[#14226B]">
                {clockTime}
                {clockPeriod && <span className="ml-1 text-[12px] font-bold">{clockPeriod}</span>}
              </p>
              <p className="mt-2 whitespace-nowrap text-[10px] font-medium text-[#14226B]">{dateText}</p>
            </div>
          </div>
        </div>

        {/* MIDDLE: live working hours + check in / out */}
        <div
          className="relative flex min-w-0 flex-col items-center justify-center gap-2.5 text-center"
          style={wide ? { borderRight: DIVIDER, padding: "0 24px" } : undefined}
        >
          <div className="flex w-full items-center justify-center">
            <p className="flex items-center gap-2 whitespace-nowrap text-[15px] font-bold text-[#14226B]">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  onBreak
                    ? "bg-amber-500"
                    : checkedIn
                      ? "live-status-dot bg-green-500"
                      : "bg-gray-400"
                }`}
              />
              Live Working Hours
            </p>
            <span
              className={`absolute right-3 top-2 shrink-0 rounded-full px-3 py-0.5 text-xs font-bold ${liveChip.cls}`}
            >
              {liveChip.text}
            </span>
          </div>

          <div className="w-full text-center">
            <p className="text-[38px] font-extrabold leading-none tabular-nums text-[#14226B]">
              {checkedIn ? formatHMS(liveWorkingMinutes) : formatHM(liveWorkingMinutes)}
            </p>
            <p className="mt-1 text-[13px] font-semibold text-[#14226B]">Current Session</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <TimeTile icon={<LogIn size={16} />} label="Check In" value={formatTime(attendanceToday?.checkIn)} />
            <TimeTile icon={<LogOut size={16} />} label="Check Out" value={formatTime(attendanceToday?.checkOut)} />
          </div>
        </div>

        {/* RIGHT: actions */}
        <div className="flex flex-col justify-center gap-2.5" style={wide ? { paddingLeft: 20 } : undefined}>
          {/* Same button toggles between starting and ending the work day */}
          {checkedIn ? (
            <button
              type="button"
              disabled={busy || loading}
              onClick={handleCheckOut}
              style={{ height: 42 }}
              className={`${actionBtn} bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_8px_18px_rgba(244,63,94,0.28)] hover:from-rose-600 hover:to-rose-700 disabled:opacity-60`}
            >
              <LogOut size={18} className="shrink-0" />
              End Work
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || loading}
              onClick={handleCheckIn}
              style={{ height: 42 }}
              className={`employee-primary-action ${actionBtn}`}
            >
              <Play size={17} className="shrink-0 fill-white" />
              Start Work
            </button>
          )}

          <button
            type="button"
            disabled={busy || loading || !checkedIn}
            onClick={onBreak ? handleBreakEnd : handleBreakStart}
            style={{ height: 42, backgroundColor: "#E4D8FF" }}
            className={`${actionBtn} border border-violet-200 text-[#14226B] shadow-sm hover:brightness-95 disabled:opacity-60`}
          >
            <Coffee size={19} className="shrink-0 text-violet-600" />
            <span>{onBreak ? "End Break" : "Start Break"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowMeeting(true)}
            style={{ height: 42 }}
            className={`employee-primary-action ${actionBtn}`}
          >
            <UsersRound size={19} className="shrink-0" />
            <span>Start a Meeting</span>
          </button>
        </div>
      </div>

      {/* Bottom stat strip */}
      <div
        className="rounded-2xl bg-[#EEF3FF] py-2.5"
        style={{
          display: "grid",
          gridTemplateColumns: wide ? "repeat(4, 1fr)" : "repeat(2, 1fr)",
          rowGap: 12,
          marginTop: 12,
        }}
      >
        <StripStat
          icon={<Briefcase size={24} strokeWidth={1.9} />}
          label="Working Time"
          value={formatDuration(liveWorkingMinutes)}
        />
        <StripStat
          icon={<Coffee size={24} strokeWidth={1.9} />}
          label="Break Time"
          value={formatDuration(attendanceToday?.breakMinutes)}
          divider={wide}
        />
        <StripStat
          icon={<Clock3 size={24} strokeWidth={1.9} />}
          label="Overtime"
          value={formatDuration(attendanceToday?.overtimeMinutes)}
          divider={wide}
        />
        <StripStat
          icon={
            checkedIn || onBreak ? (
              <CircleCheck size={24} strokeWidth={2} className={dutyColor} />
            ) : (
              <BadgeCheck size={24} strokeWidth={1.9} className="text-gray-400" />
            )
          }
          label="Status"
          value={dutyLabel}
          valueClass={dutyColor}
          divider={wide}
        />
      </div>

      <MeetingDialog
        open={showMeeting}
        onClose={() => setShowMeeting(false)}
        onCreated={onRefresh}
        scope="employee"
      />
    </section>
  );
};

export default TodayAttendance;