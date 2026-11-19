// import React from "react";
// import { CalendarDays, MoreVertical } from "lucide-react";

// type LeaveRequest = {
//   initials: string;
//   name: string;
//   leaveType: string;
//   dates: string;
//   reason: string;
//   status: "Pending" | "Approved" | "Rejected";
// };

// const PendingLeaveRequests: React.FC = () => {
//   const requests: LeaveRequest[] = [
//     {
//       initials: "SP",
//       name: "Sneha Patel",
//       leaveType: "Casual Leave",
//       dates: "18 Sep – 19 Sep",
//       reason: "Personal",
//       status: "Pending",
//     },
//     {
//       initials: "RK",
//       name: "Rohit Kumar",
//       leaveType: "Sick Leave",
//       dates: "17 Sep",
//       reason: "Fever",
//       status: "Pending",
//     },
//     {
//       initials: "AS",
//       name: "Anjali Singh",
//       leaveType: "Earned Leave",
//       dates: "20 Sep – 22 Sep",
//       reason: "Family Trip",
//       status: "Pending",
//     },
//   ];

//   return (
//     <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <CalendarDays size={20} className="text-[#10284A]" />
//           <h3 className="text-lg font-semibold text-[#10284A]">
//             Pending Leave Requests
//           </h3>
//         </div>

//         <button className="text-sm font-medium text-[#2459A6] hover:underline">
//           View All
//         </button>
//       </div>

//       <div className="mt-4 overflow-x-auto">
//         <table className="w-full text-left">
//           <thead>
//             <tr className="text-xs font-medium text-gray-400">
//               <th className="pb-3 pr-4 font-medium">Employee</th>
//               <th className="pb-3 pr-4 font-medium">Leave Type</th>
//               <th className="pb-3 pr-4 font-medium">Dates</th>
//               <th className="pb-3 pr-4 font-medium">Reason</th>
//               <th className="pb-3 pr-4 font-medium">Status</th>
//               <th className="pb-3 font-medium">Actions</th>
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-gray-100">
//             {requests.map((req) => (
//               <tr key={req.name} className="text-sm">
//                 <td className="py-3 pr-4">
//                   <div className="flex items-center gap-3">
//                     <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[#2459A6]">
//                       {req.initials}
//                     </div>
//                     <span className="font-medium text-[#10284A]">
//                       {req.name}
//                     </span>
//                   </div>
//                 </td>

//                 <td className="py-3 pr-4 text-gray-600">{req.leaveType}</td>
//                 <td className="py-3 pr-4 text-gray-600">{req.dates}</td>
//                 <td className="py-3 pr-4 text-gray-600">{req.reason}</td>

//                 <td className="py-3 pr-4">
//                   <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
//                     ● {req.status}
//                   </span>
//                 </td>

//                 <td className="py-3">
//                   <div className="flex items-center gap-2">
//                     <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700">
//                       Approve
//                     </button>

//                     <button className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600">
//                       Reject
//                     </button>

//                     <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#2459A6] transition hover:bg-gray-50">
//                       View
//                     </button>

//                     <button className="text-gray-400 hover:text-gray-600">
//                       <MoreVertical size={16} />
//                     </button>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </section>
//   );
// };

// export default PendingLeaveRequests;

import React, { useState } from "react";
import { CalendarDays } from "lucide-react";
import employeeApi from "../../../lib/employeeApi";

type LeaveRequest = {
  _id?: string;
  employee?: string | { _id: string; firstName: string; lastName: string; employeeCode?: string; department?: string };
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason?: string;
  status: string;
};

function employeeInfo(employee: LeaveRequest["employee"]) {
  if (employee && typeof employee === "object") return employee;
  return { firstName: "Unknown", lastName: "" };
}

function formatDates(from: string, to: string) {
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const fromStr = new Date(from).toLocaleDateString("en-GB", opts);
  const toStr = new Date(to).toLocaleDateString("en-GB", opts);
  return fromStr === toStr ? fromStr : `${fromStr} \u2013 ${toStr}`;
}

function initialsOf(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function leaveTypeLabel(type: string) {
  const map: Record<string, string> = {
    casual: "Casual Leave",
    sick: "Sick Leave",
    earned: "Earned Leave",
    unpaid: "Unpaid Leave",
  };
  return map[type] ?? type;
}

const PendingLeaveRequests: React.FC<{
  requests?: LeaveRequest[];
  loading?: boolean;
  onReviewed: () => void;
}> = ({ requests, loading, onReviewed }) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = requests ?? [];

  const review = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    setError(null);
    try {
      await employeeApi.patch(`/team/leave/${id}/status`, { status });
      onReviewed();
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not update this leave request.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-[#10284A]" />
          <h3 className="text-lg font-semibold text-[#10284A]">
            Pending Leave Requests
          </h3>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-medium text-gray-400">
              <th className="pb-3 pr-4 font-medium">Employee</th>
              <th className="pb-3 pr-4 font-medium">Leave Type</th>
              <th className="pb-3 pr-4 font-medium">Dates</th>
              <th className="pb-3 pr-4 font-medium">Reason</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-gray-400">
                  No pending leave requests.
                </td>
              </tr>
            ) : (
              items.map((req) => {
                const employee = employeeInfo(req.employee);
                return (
                <tr key={req._id ?? `${req.leaveType}-${req.fromDate}`} className="text-sm">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[#2459A6]">
                        {initialsOf(employee.firstName, employee.lastName)}
                      </div>
                      <span className="font-medium text-[#10284A]">
                        {employee.firstName} {employee.lastName}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 pr-4 text-gray-600">{leaveTypeLabel(req.leaveType)}</td>
                  <td className="py-3 pr-4 text-gray-600">{formatDates(req.fromDate, req.toDate)}</td>
                  <td className="py-3 pr-4 text-gray-600">{req.reason || "-"}</td>

                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                      ● Pending
                    </span>
                  </td>

                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busyId === req._id || !req._id}
                        onClick={() => req._id && review(req._id, "approved")}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        disabled={busyId === req._id || !req._id}
                        onClick={() => req._id && review(req._id, "rejected")}
                        className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PendingLeaveRequests;
