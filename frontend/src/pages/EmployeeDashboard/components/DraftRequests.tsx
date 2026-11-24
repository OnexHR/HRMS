import React, { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, FileClock } from "lucide-react";
import {
  EMPLOYEE_LEAVE_REQUESTS_EVENT,
  editEmployeeLeaveDraft,
  getEmployeeLeaveRequests,
  type EmployeeLeaveRequest,
} from "../../../lib/employeeLeaveStore";

const leaveTypeMap: Record<string, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  earned: "Earned Leave",
  unpaid: "Unpaid Leave",
};

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

function getInitialDrafts() {
  try {
    return {
      drafts: getEmployeeLeaveRequests().filter((request) => request.status === "draft"),
      error: null as string | null,
    };
  } catch (error) {
    return {
      drafts: [] as EmployeeLeaveRequest[],
      error: error instanceof Error ? error.message : "Could not load draft requests.",
    };
  }
}

const DraftRequests: React.FC = () => {
  const [initialDrafts] = useState(getInitialDrafts);
  const [drafts, setDrafts] = useState(initialDrafts.drafts);
  const loading = false;
  const [error, setError] = useState<string | null>(initialDrafts.error);

  const loadDrafts = useCallback(() => {
    setError(null);
    try {
      const requests = getEmployeeLeaveRequests();
      setDrafts(requests.filter((request) => request.status === "draft"));
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load draft requests.",
      );
    }
  }, []);

  useEffect(() => {
    window.addEventListener(EMPLOYEE_LEAVE_REQUESTS_EVENT, loadDrafts);
    return () => window.removeEventListener(EMPLOYEE_LEAVE_REQUESTS_EVENT, loadDrafts);
  }, [loadDrafts]);

  return (
    <section className="rounded-2xl border border-white/80 bg-white/85 p-6 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur">
      <div className="flex items-center gap-3">
        <FileClock size={25} className="text-[#1D4ED8]" />
        <div>
          <h3 className="text-[22px] font-extrabold leading-tight text-[#14226B]">Draft Requests</h3>
          <p className="text-[13px] text-gray-500">Leave requests saved to finish later</p>
        </div>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-blue-100 bg-white">
        <table className="w-full min-w-[640px] table-fixed border-collapse text-left [&_tbody_tr:last-child_td]:border-b-0">
          <thead>
            <tr className="bg-[#F3F7FF] text-[13px] font-semibold text-[#14226B]">
              <th className="sticky top-0 z-10 w-[20%] border-b border-r border-blue-100 bg-[#F3F7FF] px-4 py-3 text-center">Leave Type</th>
              <th className="sticky top-0 z-10 w-[15%] border-b border-r border-blue-100 bg-[#F3F7FF] px-4 py-3 text-center">From</th>
              <th className="sticky top-0 z-10 w-[15%] border-b border-r border-blue-100 bg-[#F3F7FF] px-4 py-3 text-center">To</th>
              <th className="sticky top-0 z-10 w-[8%] border-b border-r border-blue-100 bg-[#F3F7FF] px-4 py-3 text-center">Days</th>
              <th className="sticky top-0 z-10 w-[30%] border-b border-r border-blue-100 bg-[#F3F7FF] px-4 py-3 text-center">Reason</th>
              <th className="sticky top-0 z-10 w-[80px] min-w-[80px] border-b border-blue-100 bg-[#F3F7FF] px-2 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-7 text-center text-sm text-gray-400">Loading draft requests...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="py-7 text-center text-sm text-gray-400">Draft requests could not be displayed.</td></tr>
            ) : drafts.length === 0 ? (
              <tr><td colSpan={6} className="py-7 text-center text-sm text-gray-400">No saved drafts yet.</td></tr>
            ) : (
              drafts.map((draft) => (
                <tr key={draft.id}>
                  <td className="border-b border-r border-blue-100 px-4 py-3 text-center text-sm font-medium text-[#14226B]">
                    {leaveTypeMap[draft.leaveType] ?? draft.leaveType}
                  </td>
                  <td className="border-b border-r border-blue-100 px-4 py-3 text-center text-sm text-[#14226B]">{formatDate(draft.fromDate)}</td>
                  <td className="border-b border-r border-blue-100 px-4 py-3 text-center text-sm text-[#14226B]">{formatDate(draft.toDate)}</td>
                  <td className="border-b border-r border-blue-100 px-4 py-3 text-center text-sm text-[#14226B]">{draft.days}</td>
                  <td className="max-w-[280px] truncate border-b border-r border-blue-100 px-4 py-3 text-center text-sm text-[#14226B]">
                    {draft.reason || "-"}
                  </td>
                  <td className="border-b border-blue-100 px-2 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => editEmployeeLeaveDraft(draft.id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-semibold text-[#1D4ED8] transition hover:bg-blue-50"
                    >
                      View
                      <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default DraftRequests;
