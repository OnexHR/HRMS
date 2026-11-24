import React from "react";
import { CalendarClock, FileText, Mail, Save } from "lucide-react";
import { Card, CardTitle, InfoModal, PageShell } from "../ui";

const ScheduleReport: React.FC = () => {
  const [name, setName] = React.useState("");
  const [frequency, setFrequency] = React.useState("Weekly");
  const [recipient, setRecipient] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const save = () => {
    setNotice(
      name.trim()
        ? `Report "${name.trim()}" scheduled to run ${frequency.toLowerCase()} for ${recipient.trim() || "the manager team"}.`
        : "Please enter a report name before scheduling.",
    );
  };

  return (
    <PageShell crumb="Schedule Report" title="Schedule Report" subtitle="Configure recurring reports delivered to your team." icon={CalendarClock}>
      <Card>
        <CardTitle icon={FileText} title="New scheduled report" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Report name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly attendance summary" className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]" />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Frequency</span>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]">
              {["Daily", "Weekly", "Monthly", "Quarterly"].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[12px] font-semibold text-[#4B5F7D]">Recipient email</span>
            <input type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="team@example.com" className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]" />
          </label>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <button type="button" onClick={save} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1F63E8] px-5 text-[13px] font-bold text-white hover:bg-[#1850C0]">
            <Save size={16} /> Schedule Report
          </button>
          <span className="flex items-center gap-1.5 text-[11px] text-[#8795AA]"><Mail size={14} /> Delivered by email</span>
        </div>
      </Card>
      {notice && <InfoModal title="Schedule Report" message={notice} onClose={() => setNotice(null)} />}
    </PageShell>
  );
};

export default ScheduleReport;
