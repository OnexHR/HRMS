import React from "react";
import { CalendarDays, FileText, Plane, ShieldCheck } from "lucide-react";
import { Card, CardTitle, PageShell } from "../ui";

const policies = [
  { icon: CalendarDays, title: "Casual Leave", balance: "12 days / year", detail: "Short planned absences. Can be availed with 1 day notice." },
  { icon: Plane, title: "Sick Leave", balance: "10 days / year", detail: "For illness or medical reasons. Intimation required on the day." },
  { icon: FileText, title: "Earned Leave", balance: "15 days / year", detail: "Accrued monthly. Requires 3 days advance approval." },
  { icon: ShieldCheck, title: "Unpaid Leave", balance: "On approval", detail: "Leave without pay, subject to manager and HR approval." },
];

const LeavePolicies: React.FC = () => (
  <PageShell crumb="Leave Policies" title="Leave Policies" subtitle="Review the leave policies that apply to your team." icon={ShieldCheck}>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {policies.map((policy) => (
        <Card key={policy.title}>
          <CardTitle icon={policy.icon} title={policy.title} />
          <p className="mt-3 text-[24px] font-extrabold text-[#10284A]">{policy.balance}</p>
          <p className="mt-2 text-[12px] leading-5 text-[#617492]">{policy.detail}</p>
        </Card>
      ))}
    </div>
  </PageShell>
);

export default LeavePolicies;
