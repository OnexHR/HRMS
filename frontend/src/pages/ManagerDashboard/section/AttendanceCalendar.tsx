import React from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardTitle, Legend, PageShell } from "../ui";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const cellStyle: Record<string, string> = {
  Present: "bg-[#E7F7EE] text-[#169A5F]",
  "On Leave": "bg-[#FFF1E3] text-[#E57F1F]",
  Absent: "bg-[#FFE9EA] text-[#D2444F]",
  Weekend: "bg-[#F1F4F8] text-[#687990]",
};

const statusForDay = (day: number): string => {
  if (day % 7 === 0 || day % 7 === 6) return "Weekend";
  if (day % 11 === 0) return "On Leave";
  if (day % 13 === 0) return "Absent";
  return "Present";
};

const AttendanceCalendar: React.FC = () => {
  const [monthOffset, setMonthOffset] = React.useState(0);
  const viewDate = new Date();
  viewDate.setMonth(viewDate.getMonth() + monthOffset);
  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  return (
    <PageShell crumb="Attendance Calendar" title="Attendance Calendar" subtitle="View team attendance across the month at a glance." icon={CalendarDays}>
      <Card>
        <CardTitle
          icon={CalendarDays}
          title={monthLabel}
          action={
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setMonthOffset((v) => v - 1)} aria-label="Previous month" className="grid h-8 w-8 place-items-center rounded border border-[#E1E8F2] hover:bg-[#F3F6FC]"><ChevronLeft size={15} /></button>
              <button type="button" onClick={() => setMonthOffset(0)} className="rounded border border-[#E1E8F2] px-2 py-1 text-[11px] font-bold text-[#1F63E8]">Today</button>
              <button type="button" onClick={() => setMonthOffset((v) => v + 1)} aria-label="Next month" className="grid h-8 w-8 place-items-center rounded border border-[#E1E8F2] hover:bg-[#F3F6FC]"><ChevronRight size={15} /></button>
            </div>
          }
        />
        <div className="mt-4">
          <Legend items={[["Present", "#22B573"], ["On Leave", "#F59E42"], ["Absent", "#EF5B67"], ["Weekend", "#A3AFC2"]]} />
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[12px] font-bold text-[#6B7C99]">
          {dayNames.map((day) => <div key={day}>{day}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {Array.from({ length: firstWeekday }, (_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const status = statusForDay(day);
            return (
              <div key={day} className={`flex h-11 flex-col items-center justify-center rounded-lg text-[12px] font-semibold ${cellStyle[status]}`}>
                <span>{day}</span>
                <span className="text-[9px] font-medium">{status}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </PageShell>
  );
};

export default AttendanceCalendar;
