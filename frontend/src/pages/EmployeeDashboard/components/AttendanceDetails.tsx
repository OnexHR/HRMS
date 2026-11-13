// import React, { useState } from "react";
// import {
//   CalendarDays,
//   ChevronDown,
//   ChevronLeft,
//   ChevronRight,
// } from "lucide-react";

// type AttendanceStatus =
//   | "Present"
//   | "Half Day"
//   | "Leave"
//   | "Absent";

// type AttendanceDay = {
//   status: AttendanceStatus;
//   overtime?: boolean;
// };

// const AttendanceDetails: React.FC = () => {
//   const [selectedDate, setSelectedDate] = useState(17);

//   const attendanceData: Record<number, AttendanceDay> = {
//     1: { status: "Present" },
//     2: { status: "Present" },
//     3: { status: "Present" },
//     4: { status: "Absent" },
//     5: { status: "Half Day", overtime: true },
//     6: { status: "Half Day", overtime: true },

//     7: { status: "Present" },
//     8: { status: "Present", overtime: true },
//     9: { status: "Half Day" },
//     10: { status: "Half Day" },
//     11: { status: "Leave", overtime: true },
//     12: { status: "Leave", overtime: true },
//     13: { status: "Present" },

//     14: { status: "Half Day" },
//     15: { status: "Absent" },
//     16: { status: "Absent", overtime: true },
//     17: { status: "Present" },
//     18: { status: "Half Day" },
//     19: { status: "Absent" },
//     20: { status: "Leave", overtime: true },

//     21: { status: "Half Day", overtime: true },
//     22: { status: "Present" },
//     23: { status: "Present" },
//     24: { status: "Absent" },
//     25: { status: "Leave", overtime: true },
//     26: { status: "Half Day", overtime: true },
//     27: { status: "Present" },

//     28: { status: "Present" },
//     29: { status: "Present", overtime: true },
//     30: { status: "Leave", overtime: true },
//   };

//   const selectedData = attendanceData[selectedDate];

//   const getStatusColor = (status: AttendanceStatus) => {
//     switch (status) {
//       case "Present":
//         return {
//           dot: "bg-green-400",
//           ring: "border-green-300 bg-white",
//           text: "text-green-600",
//         };

//       case "Half Day":
//         return {
//           dot: "bg-yellow-400",
//           ring: "border-yellow-300 bg-white",
//           text: "text-yellow-500",
//         };

//       case "Leave":
//         return {
//           dot: "bg-blue-500",
//           ring: "border-blue-300 bg-white",
//           text: "text-blue-600",
//         };

//       case "Absent":
//         return {
//           dot: "bg-red-400",
//           ring: "border-red-300 bg-white",
//           text: "text-red-500",
//         };
//     }
//   };

//   const selectedColor = getStatusColor(selectedData.status);

//   return (
//     <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
//       {/* Header */}
//       <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
//         <CalendarDays
//           size={26}
//           className="text-[#2459A6]"
//         />

//         <h3 className="text-xl font-semibold text-[#10284A]">
//           Attendance Details
//         </h3>
//       </div>

//       {/* Main Content */}
//       <div className="mt-5 grid grid-cols-[1.55fr_0.9fr_1fr] gap-4">
//         {/* CALENDAR */}
//         <div className="rounded-xl border border-gray-100 bg-white p-4">
//           {/* Month Header */}
//           <div className="flex items-center justify-between">
//             <button
//               type="button"
//               className="flex h-8 w-8 items-center justify-center rounded-lg text-[#10284A] transition hover:bg-gray-100"
//             >
//               <ChevronLeft size={18} />
//             </button>

//             <h4 className="text-lg font-semibold text-[#10284A]">
//               September 2026
//             </h4>

//             <button
//               type="button"
//               className="flex h-8 w-8 items-center justify-center rounded-lg text-[#10284A] transition hover:bg-gray-100"
//             >
//               <ChevronRight size={18} />
//             </button>
//           </div>

//           {/* Week Days */}
//           <div className="mt-5 grid grid-cols-7 text-center">
//             {[
//               "Mon",
//               "Tue",
//               "Wed",
//               "Thu",
//               "Fri",
//               "Sat",
//               "Sun",
//             ].map((day) => (
//               <span
//                 key={day}
//                 className="text-xs font-medium text-gray-400"
//               >
//                 {day}
//               </span>
//             ))}
//           </div>

//           {/* Calendar */}
//           <div className="mt-3 grid grid-cols-7 gap-y-2 text-center">
//             {/* August 31 */}
//             <div className="flex h-12 flex-col items-center justify-center">
//               <span className="text-sm text-gray-300">
//                 31
//               </span>

//               <span className="mt-1 h-2 w-2 rounded-full bg-gray-100" />
//             </div>

//             {Array.from({ length: 30 }, (_, index) => {
//               const date = index + 1;
//               const data = attendanceData[date];
//               const colors = getStatusColor(data.status);

//               return (
//                 <button
//                   key={date}
//                   type="button"
//                   onClick={() => setSelectedDate(date)}
//                   className="flex h-12 flex-col items-center justify-center"
//                 >
//                   {/* Date */}
//                   <span
//                     className={`flex h-8 w-8 items-center justify-center text-sm font-medium ${
//                       selectedDate === date
//                         ? "rounded-full bg-[#2459A6] text-white"
//                         : "text-[#10284A]"
//                     }`}
//                   >
//                     {date}
//                   </span>

//                   {/* Status */}
//                   <span
//                     className={`mt-1 flex h-3 w-3 items-center justify-center rounded-full ${
//                       data.overtime
//                         ? `border-2 ${colors.ring}`
//                         : colors.dot
//                     }`}
//                   >
//                     {data.overtime && (
//                       <span
//                         className={`h-1.5 w-1.5 rounded-full ${colors.dot}`}
//                       />
//                     )}
//                   </span>
//                 </button>
//               );
//             })}
//           </div>
//         </div>

//         {/* LEGEND */}
//         <div className="rounded-xl border border-gray-100 bg-white p-4">
//           <h4 className="text-lg font-semibold text-[#10284A]">
//             Legend
//           </h4>

//           <div className="mt-5 space-y-4">
//             {/* Present */}
//             <div className="flex items-center gap-3">
//               <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
//                 <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
//               </span>

//               <span className="text-sm text-gray-600">
//                 Present
//               </span>
//             </div>

//             {/* Half Day */}
//             <div className="flex items-center gap-3">
//               <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100">
//                 <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
//               </span>

//               <span className="text-sm text-gray-600">
//                 Half Day
//               </span>
//             </div>

//             {/* Leave */}
//             <div className="flex items-center gap-3">
//               <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100">
//                 <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
//               </span>

//               <span className="text-sm text-gray-600">
//                 Leave
//               </span>
//             </div>

//             {/* Absent */}
//             <div className="flex items-center gap-3">
//               <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
//                 <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
//               </span>

//               <span className="text-sm text-gray-600">
//                 Absent
//               </span>
//             </div>

//             {/* Present + Overtime */}
//             <div className="flex items-center gap-3">
//               <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-green-300">
//                 <span className="h-2 w-2 rounded-full bg-green-500" />
//               </span>

//               <span className="text-sm text-gray-600">
//                 Present + Overtime
//               </span>
//             </div>

//             {/* Half Day + Overtime */}
//             <div className="flex items-center gap-3">
//               <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-yellow-300">
//                 <span className="h-2 w-2 rounded-full bg-yellow-400" />
//               </span>

//               <span className="text-sm text-gray-600">
//                 Half Day + Overtime
//               </span>
//             </div>

//             {/* Leave + Overtime */}
//             <div className="flex items-center gap-3">
//               <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-300">
//                 <span className="h-2 w-2 rounded-full bg-blue-500" />
//               </span>

//               <span className="text-sm text-gray-600">
//                 Leave + Overtime
//               </span>
//             </div>

//             {/* Absent + Overtime */}
//             <div className="flex items-center gap-3">
//               <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-red-300">
//                 <span className="h-2 w-2 rounded-full bg-red-500" />
//               </span>

//               <span className="text-sm text-gray-600">
//                 Absent + Overtime
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* RIGHT SIDE */}
//         <div className="space-y-4">
//           {/* Select Date */}
//           <div className="rounded-xl border border-gray-100 bg-white p-4">
//             <h4 className="text-lg font-semibold text-[#10284A]">
//               Select Date
//             </h4>

//             <button
//               type="button"
//               className="mt-3 flex h-11 w-full items-center justify-between rounded-xl border border-blue-100 bg-white px-3 text-sm text-gray-600 shadow-sm"
//             >
//               <div className="flex items-center gap-2">
//                 <CalendarDays
//                   size={18}
//                   className="text-[#2459A6]"
//                 />

//                 <span>
//                   {selectedDate} September 2026
//                 </span>
//               </div>

//               <ChevronDown
//                 size={17}
//                 className="text-gray-500"
//               />
//             </button>
//           </div>

//           {/* Selected Date Details */}
//           <div className="rounded-xl border border-gray-100 bg-white p-4">
//             <h4 className="text-lg font-semibold text-[#10284A]">
//               Selected Date Details
//             </h4>

//             <div className="mt-4 divide-y divide-gray-100">
//               {/* Status */}
//               <div className="flex items-center justify-between py-3">
//                 <span className="text-sm text-gray-500">
//                   Status
//                 </span>

//                 <span
//                   className={`rounded-full px-3 py-1 text-xs font-semibold ${
//                     selectedData.status === "Present"
//                       ? "bg-green-50 text-green-600"
//                       : selectedData.status === "Half Day"
//                       ? "bg-yellow-50 text-yellow-600"
//                       : selectedData.status === "Leave"
//                       ? "bg-blue-50 text-blue-600"
//                       : "bg-red-50 text-red-600"
//                   }`}
//                 >
//                   {selectedData.status}
//                 </span>
//               </div>

//               {/* Working Hours */}
//               <div className="flex items-center justify-between py-3">
//                 <span className="text-sm text-gray-500">
//                   Working Hours
//                 </span>

//                 <span className="text-sm font-semibold text-[#10284A]">
//                   {selectedData.status === "Present"
//                     ? "6h 24m"
//                     : "0h 00m"}
//                 </span>
//               </div>

//               {/* Break Time */}
//               <div className="flex items-center justify-between py-3">
//                 <span className="text-sm text-gray-500">
//                   Break Time
//                 </span>

//                 <span className="text-sm font-semibold text-[#10284A]">
//                   {selectedData.status === "Present"
//                     ? "32m"
//                     : "0m"}
//                 </span>
//               </div>

//               {/* Overtime */}
//               <div className="flex items-center justify-between py-3">
//                 <span className="text-sm text-gray-500">
//                   Overtime
//                 </span>

//                 <span className="text-sm font-semibold text-[#10284A]">
//                   00h 00m
//                 </span>
//               </div>

//               {/* Tasks */}
//               <div className="flex items-center justify-between py-3">
//                 <span className="text-sm text-gray-500">
//                   Tasks Completed
//                 </span>

//                 <span className="text-sm font-semibold text-[#10284A]">
//                   {selectedData.status === "Present"
//                     ? "2 / 3"
//                     : "0 / 0"}
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// };

// export default AttendanceDetails;

import React, { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import employeeApi from "../../../lib/employeeApi";
import {
  statusLabel,
  statusColor,
} from "./attendanceRules";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

// The day status from the backend is already the final day status ("present",
// "late", "half_day", "leave", "absent"). We just need the combined label and
// the color. The backend computes this correctly using Kolkata time.
function getDayStatus(entry: DayEntry | undefined): "present" | "late" | "half_day" | "leave" | "absent" {
  if (!entry) return "absent";
  // The backend already computed the correct status in Kolkata time. Trust it.
  return entry.status as "present" | "late" | "half_day" | "leave" | "absent";
}

function parseOvertime(overtime: string | null | undefined): number {
  if (!overtime) return 0;
  // Format: "Xh Ym"
  const match = overtime.match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

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
      const res = await employeeApi.get("/attendance/month", { params: { date: date.toISOString() } });
      setDayMap(res.data?.dayMap ?? {});
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not load attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(viewDate);
    setSelectedDate(null);
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
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-start

  const entryFor = (day: number): DayEntry | undefined => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return dayMap[key];
  };

  const today = selectedDate ? entryFor(selectedDate) : undefined;
  const dayStatus = getDayStatus(today);
  const overtimeMinutes = today?.overtime ? parseOvertime(today.overtime) : 0;
  const label = statusLabel(dayStatus, overtimeMinutes);
  const colors = statusColor(dayStatus);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <CalendarDays
          size={26}
          className="text-[#2459A6]"
        />

        <h3 className="text-xl font-semibold text-[#10284A]">
          Attendance Details
        </h3>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      {/* Main Content */}
      <div className="mt-5 grid grid-cols-[1.55fr_0.9fr_1fr] gap-4">
        {/* CALENDAR */}
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          {/* Month Header */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#10284A] transition hover:bg-gray-100"
            >
              <ChevronLeft size={18} />
            </button>

            <h4 className="text-lg font-semibold text-[#10284A]">
              {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h4>

            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#10284A] transition hover:bg-gray-100"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Week Days */}
          <div className="mt-5 grid grid-cols-7 text-center">
            {WEEKDAYS.map((day) => (
              <span
                key={day}
                className="text-xs font-medium text-gray-400"
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar */}
          <div className="mt-3 grid grid-cols-7 gap-y-2 text-center">
            {Array.from({ length: firstWeekday }, (_, i) => (
              <div key={`blank-${i}`} className="h-12" />
            ))}

            {loading
              ? Array.from({ length: daysInMonth }, (_, i) => (
                  <div key={i} className="flex h-12 flex-col items-center justify-center">
                    <span className="text-sm text-gray-300">{i + 1}</span>
                  </div>
                ))
              : Array.from({ length: daysInMonth }, (_, index) => {
                  const date = index + 1;
                  const entry = entryFor(date);
                  const dayStatus = getDayStatus(entry);
                  const overtimeMinutes = entry?.overtime ? parseOvertime(entry.overtime) : 0;
                  const colors = statusColor(dayStatus);
                  const hasOvertime = overtimeMinutes > 0;

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedDate(date)}
                      className="flex h-12 flex-col items-center justify-center"
                    >
                      {/* Date */}
                      <span
                        className={`flex h-8 w-8 items-center justify-center text-sm font-medium ${
                          selectedDate === date
                            ? "rounded-full bg-[#2459A6] text-white"
                            : "text-[#10284A]"
                        }`}
                      >
                        {date}
                      </span>

                      {/* Status */}
                      {entry ? (
                        <span
                          className={`mt-1 flex h-3 w-3 items-center justify-center rounded-full ${
                            hasOvertime ? `border-2 ${colors.ring}` : colors.dot
                          }`}
                        >
                          {hasOvertime && <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />}
                        </span>
                      ) : (
                        <span className="mt-1 h-2 w-2 rounded-full bg-gray-100" />
                      )}
                    </button>
                  );
                })}
          </div>
        </div>

        {/* LEGEND */}
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <h4 className="text-lg font-semibold text-[#10284A]">
            Legend
          </h4>

          <div className="mt-5 space-y-4">
            {[
              { label: "Present", cls: "bg-green-100 text-green-500" },
              { label: "Half Day", cls: "bg-yellow-100 text-yellow-400" },
              { label: "Leave", cls: "bg-blue-100 text-blue-500" },
              { label: "Absent", cls: "bg-red-100 text-red-500" },
            ].map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${cls.split(" ")[0]}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${cls.split(" ")[1].replace("text-", "bg-")}`} />
                </span>
                <span className="text-sm text-gray-600">{label}</span>
              </div>
            ))}

            {[
              { label: "Present + Overtime", cls: "border-green-300 bg-green-500" },
              { label: "Half Day + Overtime", cls: "border-yellow-300 bg-yellow-400" },
              { label: "Leave + Overtime", cls: "border-blue-300 bg-blue-500" },
              { label: "Absent + Overtime", cls: "border-red-300 bg-red-500" },
            ].map(({ label, cls }) => {
              const [border, bg] = cls.split(" ");
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${border}`}>
                    <span className={`h-2 w-2 rounded-full ${bg}`} />
                  </span>
                  <span className="text-sm text-gray-600">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-4">
          {/* Select Date */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h4 className="text-lg font-semibold text-[#10284A]">
              Select Date
            </h4>

            <div className="mt-3 flex h-11 w-full items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 text-sm text-gray-600 shadow-sm">
              <CalendarDays
                size={18}
                className="text-[#2459A6]"
              />

              <span>
                {selectedDate
                  ? `${selectedDate} ${viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                  : "No date selected"}
              </span>
            </div>
          </div>

          {/* Selected Date Details */}
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h4 className="text-lg font-semibold text-[#10284A]">
              Selected Date Details
            </h4>

            {!selectedDate ? (
              <p className="mt-4 text-sm text-gray-400">Pick a date on the calendar.</p>
            ) : (
              <div className="mt-4 divide-y divide-gray-100">
                {/* Status */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}>
                    {label}
                  </span>
                </div>

                {/* Working Hours */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Working Hours</span>
                  <span className="text-sm font-semibold text-[#10284A]">
                    {today?.workingHours ?? "0h 00m"}
                  </span>
                </div>

                {/* Break Time */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Break Time</span>
                  <span className="text-sm font-semibold text-[#10284A]">
                    {today?.breakTime ?? "0m"}
                  </span>
                </div>

                {/* Overtime */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Overtime</span>
                  <span className="text-sm font-semibold text-[#10284A]">
                    {today?.overtime ?? "00h 00m"}
                  </span>
                </div>

                {/* Tasks */}
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Tasks Completed</span>
                  <span className="text-sm font-semibold text-[#10284A]">
                    {today?.tasksCompleted ?? 0}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AttendanceDetails;
