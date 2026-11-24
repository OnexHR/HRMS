import React from "react";
import { BarChart3, CalendarDays, CalendarPlus, Check, CheckCircle2, Clock3, Download, Scale, ShieldCheck, Users, X, XCircle, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import employeeApi from "../../lib/employeeApi";
import type { ManagerDashboardData } from "../../types/Employee";
import { Avatar, Card, CardTitle, Donut, DetailModal, Legend, LineChart, LinkButton, PageShell, Pill, PrimaryButton, QuickActions, SelectBox, StatCard, Th, downloadCsv, field, lastMonths, monthLabel, sameMonth } from "./ui";

type LeaveRequest = NonNullable<ManagerDashboardData["pendingLeaves"]>[number];
type RequestStatus = "pending" | "approved" | "rejected";

const LEAVE_LABELS: Record<string, string> = {
  casual: "Casual Leave",
  sick: "Sick Leave",
  earned: "Earned Leave",
  unpaid: "Unpaid Leave",
  personal: "Personal Leave",
};

const getStatus = (request: LeaveRequest): RequestStatus => {
  const status = String(request.status).toLowerCase();
  return status === "approved" || status === "rejected" ? status : "pending";
};

function getEmployee(request: LeaveRequest) {
  const employee = request.employee;
  if (!employee || typeof employee !== "object") return { name: "Team Member" };
  const info = employee as { firstName?: unknown; lastName?: unknown };
  return {
    name: [info.firstName, info.lastName].filter((part): part is string => typeof part === "string" && part.length > 0).join(" ") || "Team Member",
  };
}

const leaveLabel = (request: LeaveRequest) => LEAVE_LABELS[String(request.leaveType).toLowerCase()] ?? (String(request.leaveType) || "—");

function dateShort(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}
function dateFull(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}
function dayCount(from: string, to: string) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return "—";
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

const LeaveRequests: React.FC<{
  requests?: NonNullable<ManagerDashboardData["pendingLeaves"]>;
  loading?: boolean;
  loadError?: string | null;
  onReviewed: () => void | Promise<void>;
}> = ({ requests = [], loading = false, loadError, onReviewed }) => {
  const navigate = useNavigate();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<LeaveRequest | null>(null);
  const [typeFilter, setTypeFilter] = React.useState("");
  const [showAllPending, setShowAllPending] = React.useState(false);
  const [showAllHistory, setShowAllHistory] = React.useState(false);

  const pending = requests.filter((r) => getStatus(r) === "pending");
  const history = requests.filter((r) => getStatus(r) !== "pending");
  const approved = history.filter((r) => getStatus(r) === "approved").length;
  const rejected = history.length - approved;
  const historyTypes = Array.from(new Set(history.map(leaveLabel)));
  const filteredHistory = history.filter((r) => !typeFilter || leaveLabel(r) === typeFilter);
  const pendingRows = showAllPending ? pending : pending.slice(0, 4);
  const historyRows = showAllHistory ? filteredHistory : filteredHistory.slice(0, 5);

  const months = lastMonths(6);
  const countFor = (status: RequestStatus) =>
    months.map((m) => requests.filter((r) => getStatus(r) === status && sameMonth(new Date(String(r.fromDate)), m)).length);
  const trend = { approved: countFor("approved"), pending: countFor("pending"), rejected: countFor("rejected") };
  const peak = Math.max(0, ...trend.approved, ...trend.pending, ...trend.rejected);
  const yMax = Math.max(4, Math.ceil(peak / 2) * 2);

  const review = async (request: LeaveRequest, status: "approved" | "rejected") => {
    if (typeof request._id !== "string") {
      setError("This leave request cannot be updated because its ID is missing.");
      return;
    }
    setBusyId(request._id);
    setError(null);
    try {
      await employeeApi.patch(`/team/leave/${request._id}/status`, { status });
      await onReviewed();
    } catch (reviewError) {
      setError((reviewError as { response?: { data?: { message?: string } } }).response?.data?.message || "Could not update this leave request.");
    } finally {
      setBusyId(null);
    }
  };

  const exportReport = () =>
    downloadCsv("leave-requests.csv", [
      ["Employee", "Leave Type", "Start Date", "End Date", "Days", "Reason", "Status"],
      ...requests.map((r) => [getEmployee(r).name, leaveLabel(r), dateFull(String(r.fromDate)), dateFull(String(r.toDate)), String(dayCount(String(r.fromDate), String(r.toDate))), typeof r.reason === "string" ? r.reason : "", getStatus(r)]),
    ]);

  const dash = loading ? "—" : undefined;
  const person = (request: LeaveRequest) => {
    const name = getEmployee(request).name;
    return (
      <button type="button" onClick={() => setDetail(request)} className="flex items-center gap-2.5 text-left">
        <Avatar name={name} /><span className="font-semibold text-[#10284A]">{name}</span>
      </button>
    );
  };

  return (
    <PageShell
      crumb="Leave Management"
      title="Leave Management"
      subtitle="Manage leave requests and track team leaves efficiently."
      icon={CalendarDays}
      actions={<PrimaryButton onClick={exportReport} outline><Download size={16} /> Export Report</PrimaryButton>}
    >
      {(error || loadError) && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-2 text-[12px] font-semibold text-rose-600">{error || loadError}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Leaves" value={dash ?? requests.length} sub="All team requests" icon={CalendarDays} tone="blue" />
        <StatCard label="Approved" value={dash ?? approved} sub="Reviewed requests" icon={CheckCircle2} tone="green" />
        <StatCard label="Pending" value={dash ?? pending.length} sub="Awaiting review" icon={Clock3} tone="orange" />
        <StatCard label="Rejected" value={dash ?? rejected} sub="Reviewed requests" icon={XCircle} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle icon={BarChart3} title="Leave Trends" />
          <div className="mt-2"><Legend items={[["Approved", "#2F6BEA"], ["Pending", "#F59E42"], ["Rejected", "#EF4444"]]} /></div>
          <div className="mt-2">
            <LineChart
              labels={months.map(monthLabel)}
              yMax={yMax}
              ticks={yMax / 2}
              showValues={false}
              series={[
                { name: "Approved", color: "#2F6BEA", values: trend.approved, fill: true },
                { name: "Pending", color: "#F59E42", values: trend.pending },
                { name: "Rejected", color: "#EF4444", values: trend.rejected },
              ]}
            />
          </div>
          <p className="text-[11px] text-[#8795AA]">Requests counted by their start month.</p>
        </Card>

        <Card>
          <CardTitle icon={Scale} title="Leave Balance" />
          <div className="mt-5 flex flex-wrap items-center justify-around gap-5">
            <Donut segments={[]} size={150}>
              <div><p className="text-[26px] font-extrabold leading-none text-[#8795AA]">—</p><p className="mt-1 text-[12px] font-medium">Days Left</p></div>
            </Donut>
            <p className="max-w-[170px] rounded-lg bg-[#F5F8FE] p-3 text-[12px] leading-5 text-[#617492]">Leave balances are not available from the current manager API.</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle icon={Clock3} title="Pending Leave Approvals" action={pending.length > 4 ? <LinkButton onClick={() => setShowAllPending((v) => !v)}>{showAllPending ? "Show Less" : "View All"}</LinkButton> : undefined} />
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead><tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]"><Th first>Employee</Th><Th>Leave Type</Th><Th>Duration</Th><Th>Applied On</Th><Th>Reason</Th><Th last>Action</Th></tr></thead>
            <tbody>
              {pendingRows.map((request, index) => {
                const id = typeof request._id === "string" ? request._id : `leave-${index}`;
                const busy = busyId === request._id;
                return (
                  <tr key={id} className="border-b border-[#F0F3F8] last:border-0">
                    <td className="py-3 pl-3">{person(request)}</td>
                    <td>{leaveLabel(request)}</td>
                    <td>{dateShort(String(request.fromDate))} – {dateShort(String(request.toDate))}</td>
                    <td>{dateFull(field(request, "createdAt"))}</td>
                    <td className="max-w-[180px] truncate pr-3">{typeof request.reason === "string" && request.reason ? request.reason : "—"}</td>
                    <td className="pr-3">
                      <div className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => void review(request, "approved")} className="inline-flex items-center gap-1 rounded-md bg-[#1F63E8] px-3.5 py-1.5 text-[12px] font-bold text-white hover:bg-[#1850C0] disabled:opacity-50"><Check size={13} />Approve</button>
                        <button type="button" disabled={busy} onClick={() => void review(request, "rejected")} className="inline-flex items-center gap-1 rounded-md border border-[#1F63E8] bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#1F63E8] hover:bg-[#EEF4FF] disabled:opacity-50"><X size={13} />Reject</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pendingRows.length === 0 && <tr><td colSpan={6} className="h-20 text-center text-[12px] text-[#8795AA]">{loading ? "Loading requests…" : "No pending requests."}</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardTitle
            icon={ShieldCheck}
            title="Leave History"
            action={<div className="flex items-center gap-3"><SelectBox value={typeFilter} onChange={setTypeFilter} allLabel="All Types" options={historyTypes} />{filteredHistory.length > 5 && <LinkButton onClick={() => setShowAllHistory((v) => !v)}>{showAllHistory ? "Show Less" : "View All"}</LinkButton>}</div>}
          />
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead><tr className="bg-[#F3F6FC] text-[12px] font-bold text-[#10284A]"><Th first>Employee</Th><Th>Leave Type</Th><Th>Duration</Th><Th>Status</Th><Th last>Applied On</Th></tr></thead>
              <tbody>
                {historyRows.map((request, index) => (
                  <tr key={typeof request._id === "string" ? request._id : `history-${index}`} className="border-b border-[#F0F3F8] last:border-0">
                    <td className="py-3 pl-3">{person(request)}</td>
                    <td>{leaveLabel(request)}</td>
                    <td>{dateShort(String(request.fromDate))} – {dateShort(String(request.toDate))}</td>
                    <td><Pill text={getStatus(request) === "approved" ? "Approved" : "Rejected"} /></td>
                    <td className="pr-3">{dateFull(field(request, "createdAt"))}</td>
                  </tr>
                ))}
                {historyRows.length === 0 && <tr><td colSpan={5} className="h-20 text-center text-[12px] text-[#8795AA]">{loading ? "Loading history…" : "No reviewed leave requests."}</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardTitle icon={Zap} title="Quick Actions" />
          <QuickActions
            items={[
              ["Apply Leave", CalendarPlus, () => navigate("/manager/apply-leave")],
              ["View Calendar", CalendarDays, () => navigate("/manager/attendance-calendar")],
              ["View Reports", Users, () => navigate("/manager/reports")],
              ["Manage Policies", ShieldCheck, () => navigate("/manager/leave-policies")],
            ]}
          />
        </Card>
      </div>

      {detail && (
        <DetailModal
          title={getEmployee(detail).name}
          subtitle={leaveLabel(detail)}
          onClose={() => setDetail(null)}
          rows={[
            ["Dates", `${dateFull(String(detail.fromDate))} – ${dateFull(String(detail.toDate))}`],
            ["Days", String(dayCount(String(detail.fromDate), String(detail.toDate)))],
            ["Reason", typeof detail.reason === "string" && detail.reason ? detail.reason : "—"],
            ["Status", <span className="capitalize">{getStatus(detail)}</span>],
          ]}
        />
      )}
    </PageShell>
  );
};

export default LeaveRequests;
