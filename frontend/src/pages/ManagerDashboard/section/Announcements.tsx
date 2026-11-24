import React from "react";
import { Megaphone, Pin } from "lucide-react";
import { Card, CardTitle, PageShell, Pill } from "../ui";

const announcements = [
  { title: "Q4 performance review cycle is now open", date: "Nov 20, 2026", tag: "HR", body: "Please complete your team's reviews before December 20, 2026." },
  { title: "Office closed for the winter holidays", date: "Nov 15, 2026", tag: "Company", body: "The office will remain closed from December 25 to December 31." },
  { title: "New attendance policy effective December", date: "Nov 10, 2026", tag: "Policy", body: "Check-in after 09:45 will be marked as late under the updated policy." },
];

const Announcements: React.FC = () => (
  <PageShell crumb="Announcements" title="Announcements" subtitle="Stay up to date with company and team announcements." icon={Megaphone}>
    <Card>
      <CardTitle icon={Megaphone} title="Latest announcements" />
      <ul className="mt-4 space-y-3">
        {announcements.map((item) => (
          <li key={item.title} className="rounded-xl border border-[#E6ECF6] bg-[#F8FAFD] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Pin size={15} className="text-[#1F63E8]" />
                <h3 className="text-[14px] font-bold text-[#10284A]">{item.title}</h3>
              </div>
              <Pill text={item.tag} />
            </div>
            <p className="mt-2 text-[12px] leading-5 text-[#617492]">{item.body}</p>
            <p className="mt-2 text-[11px] text-[#8795AA]">{item.date}</p>
          </li>
        ))}
      </ul>
    </Card>
  </PageShell>
);

export default Announcements;
