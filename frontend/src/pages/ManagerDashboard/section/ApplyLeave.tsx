import React from "react";
import { CalendarPlus, Send } from "lucide-react";
import { Card, CardTitle, InfoModal, PageShell } from "../ui";

const ApplyLeave: React.FC = () => {
  const [type, setType] = React.useState("Casual Leave");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const submit = () => {
    setNotice(
      from && to
        ? `${type} request submitted for ${from}${to !== from ? ` to ${to}` : ""}.`
        : "Please select both a start and end date before submitting.",
    );
  };

  return (
    <PageShell crumb="Apply Leave" title="Apply Leave" subtitle="Submit a leave request on behalf of a team member." icon={CalendarPlus}>
      <Card>
        <CardTitle icon={CalendarPlus} title="Leave request" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Leave type</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]">
              {["Casual Leave", "Sick Leave", "Earned Leave", "Unpaid Leave", "Personal Leave"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Employee</span>
            <input placeholder="Team member name" className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">From date</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">To date</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Reason</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for leave..." className="mt-1.5 w-full rounded-lg border border-[#DCE6F7] px-3 py-2 text-[13px] outline-none focus:border-[#1F63E8]" />
          </label>
        </div>
        <button type="button" onClick={submit} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1F63E8] px-5 text-[13px] font-bold text-white hover:bg-[#1850C0]">
          <Send size={16} /> Submit Request
        </button>
      </Card>
      {notice && <InfoModal title="Apply Leave" message={notice} onClose={() => setNotice(null)} />}
    </PageShell>
  );
};

export default ApplyLeave;
