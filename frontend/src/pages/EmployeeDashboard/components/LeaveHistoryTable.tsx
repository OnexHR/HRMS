import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, History, Search } from "lucide-react";
import {
  EMPLOYEE_LEAVE_REQUESTS_EVENT,
  getEmployeeLeaveRequests,
  type EmployeeLeaveRequest,
} from "../../../lib/employeeLeaveStore";
import StyledSelect from "./StyledSelect";

type LeaveRecord = EmployeeLeaveRequest;

const leaveTypeMap: Record<string, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  earned: "Earned Leave",
  unpaid: "Unpaid Leave",
};

const statusStyles: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-rose-100 text-rose-600",
  pending: "bg-amber-100 text-amber-700",
  draft: "bg-slate-100 text-slate-600",
  cancelled: "bg-gray-100 text-gray-500",
};

const statusOptions = ["approved", "rejected", "pending", "cancelled"];

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const TH =
  "sticky top-0 z-10 border-b border-r border-blue-100 bg-[#F3F7FF] px-4 py-3 text-center text-[13px] font-semibold text-[#14226B] last:border-r-0";
const TD = "border-b border-r border-blue-100 px-4 py-3 text-center text-sm last:border-r-0";

function getInitialLeaveHistory() {
  try {
    return { records: getEmployeeLeaveRequests(), error: null as string | null };
  } catch (error) {
    return {
      records: [] as LeaveRecord[],
      error: error instanceof Error ? error.message : "Could not load leave history.",
    };
  }
}

const LeaveHistoryTable: React.FC = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [initialHistory] = useState(getInitialLeaveHistory);
  const [records, setRecords] = useState<LeaveRecord[]>(initialHistory.records);
  const [loadError, setLoadError] = useState<string | null>(initialHistory.error);

  useEffect(() => {
    const loadRecords = () => {
      try {
        setLoadError(null);
        setRecords(getEmployeeLeaveRequests());
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Could not load leave history.");
      }
    };
    window.addEventListener(EMPLOYEE_LEAVE_REQUESTS_EVENT, loadRecords);
    return () => window.removeEventListener(EMPLOYEE_LEAVE_REQUESTS_EVENT, loadRecords);
  }, []);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase();
    const thisYear = new Date().getFullYear();

    return records.filter((r) => {
      const label = leaveTypeMap[r.leaveType] ?? r.leaveType;
      const reason = r.reason.toLowerCase();
      const status = r.status;

      const matchesSearch = label.toLowerCase().includes(q) || reason.includes(q);
      const matchesStatus = status !== "draft" && (statusFilter === "all" || status === statusFilter);
      const matchesType = typeFilter === "all" || r.leaveType === typeFilter;
      const matchesYear = yearFilter === "all" || new Date(r.fromDate).getFullYear() === thisYear;

      return matchesSearch && matchesStatus && matchesType && matchesYear;
    });
  }, [records, search, statusFilter, typeFilter, yearFilter]);

  return (
    <section className={`${CARD} p-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <History size={26} className="text-[#1D4ED8]" />
          <div>
            <h3 className="text-[22px] font-extrabold leading-tight text-[#14226B]">Leave History</h3>
            <p className="text-[13px] text-gray-500">Track your previous leave requests</p>
          </div>
        </div>

        <div className="flex w-full items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-2.5 sm:w-auto">
          <Search size={16} className="shrink-0 text-[#14226B]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search leave history..."
            className="w-full bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400 sm:w-52"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="w-40">
          <StyledSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "All Status" },
              ...statusOptions.map((status) => ({
                value: status,
                label: status.charAt(0).toUpperCase() + status.slice(1),
              })),
            ]}
            ariaLabel="Filter leave history by status"
            triggerClassName="py-2.5"
          />
        </div>

        <div className="w-40">
          <StyledSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "All Types" },
              ...Object.entries(leaveTypeMap).map(([value, label]) => ({ value, label })),
            ]}
            ariaLabel="Filter leave history by type"
            triggerClassName="py-2.5"
          />
        </div>

        <div className="w-40">
          <StyledSelect
            value={yearFilter}
            onChange={setYearFilter}
            options={[
              { value: "all", label: "All Years" },
              { value: "this", label: "This Year" },
            ]}
            ariaLabel="Filter leave history by year"
            triggerClassName="py-2.5"
          />
        </div>
      </div>

      <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-blue-100 bg-white">
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left [&_tbody_tr:last-child_td]:border-b-0">
          <thead>
            <tr>
              <th className={`${TH} w-[17%]`}>Leave Type</th>
              <th className={`${TH} w-[14%]`}>From</th>
              <th className={`${TH} w-[14%]`}>To</th>
              <th className={`${TH} w-[8%]`}>Days</th>
              <th className={`${TH} w-[27%]`}>Reason</th>
              <th className={`${TH} w-[12%]`}>Status</th>
              <th className={`${TH} w-[84px] min-w-[84px] whitespace-nowrap px-1 text-xs`}>View More</th>
            </tr>
          </thead>

          <tbody>
            {loadError ? (
                <tr>
                  <td colSpan={7} role="alert" className="py-8 text-center text-sm text-rose-600">
                    {loadError}
                  </td>
                </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                  No leave requests match your search.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => {
                const label = leaveTypeMap[r.leaveType] ?? r.leaveType;
                const status = String(r.status || "pending").toLowerCase();
                return (
                  <tr key={r.id}>
                    <td className={`${TD} font-medium text-[#14226B]`}>{label}</td>
                    <td className={`${TD} text-[#14226B]`}>{formatDate(r.fromDate)}</td>
                    <td className={`${TD} text-[#14226B]`}>{formatDate(r.toDate)}</td>
                    <td className={`${TD} text-[#14226B]`}>{r.days}</td>
                    <td className={`${TD} break-words text-[#14226B]`}>{r.reason || "-"}</td>

                    <td className={TD}>
                      <span
                        className={`inline-block rounded-md px-3 py-0.5 text-xs font-semibold ${
                          statusStyles[status] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>

                    <td className={TD}>
                      <button
                        type="button"
                        className="mx-auto inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-[#1D4ED8] hover:underline"
                      >
                        View
                        <ArrowRight size={14} />
                      </button>
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

export default LeaveHistoryTable;