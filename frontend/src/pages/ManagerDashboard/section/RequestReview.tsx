import React from "react";
import { ClipboardList, Send, Star } from "lucide-react";
import { Card, CardTitle, InfoModal, PageShell } from "../ui";

const RequestReview: React.FC = () => {
  const [employee, setEmployee] = React.useState("");
  const [cycle, setCycle] = React.useState("Quarterly");
  const [note, setNote] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const submit = () => {
    setNotice(
      employee.trim()
        ? `Review request for ${employee.trim()} (${cycle.toLowerCase()} cycle) has been submitted.`
        : "Please select an employee before submitting the request.",
    );
  };

  return (
    <PageShell crumb="Request Review" title="Request Review" subtitle="Submit a performance review request for a team member." icon={ClipboardList}>
      <Card>
        <CardTitle icon={Star} title="New review request" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Employee</span>
            <input value={employee} onChange={(e) => setEmployee(e.target.value)} placeholder="e.g. Ayesha Khan" className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Review cycle</span>
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]">
              {["Quarterly", "Half-yearly", "Annual", "Probation"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Notes</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Add context for the reviewer..." className="mt-1.5 w-full rounded-lg border border-[#DCE6F7] px-3 py-2 text-[13px] outline-none focus:border-[#1F63E8]" />
          </label>
        </div>
        <button type="button" onClick={submit} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1F63E8] px-5 text-[13px] font-bold text-white hover:bg-[#1850C0]">
          <Send size={16} /> Submit Request
        </button>
      </Card>
      {notice && <InfoModal title="Request Review" message={notice} onClose={() => setNotice(null)} />}
    </PageShell>
  );
};

export default RequestReview;
