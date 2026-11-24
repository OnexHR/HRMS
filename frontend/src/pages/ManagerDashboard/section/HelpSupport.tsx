import React from "react";
import { LifeBuoy, Mail, MessageCircle, Phone } from "lucide-react";
import { Card, CardTitle, PageShell } from "../ui";

const channels = [
  { icon: MessageCircle, title: "Chat with HR", detail: "Get instant help from the HR support team during office hours.", action: "Start chat" },
  { icon: Mail, title: "Email support", detail: "Write to hr-support@example.com for detailed assistance.", action: "Compose email" },
  { icon: Phone, title: "Call HR desk", detail: "Reach the HR helpdesk at extension 4100, 09:00 – 18:00.", action: "View number" },
];

const HelpSupport: React.FC = () => (
  <PageShell crumb="Help & Support" title="Help & Support" subtitle="Get help with manager tools and HR-related questions." icon={LifeBuoy}>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {channels.map((channel) => (
        <Card key={channel.title}>
          <CardTitle icon={channel.icon} title={channel.title} />
          <p className="mt-3 text-[12px] leading-5 text-[#617492]">{channel.detail}</p>
          <button type="button" className="mt-4 rounded-lg border border-[#1F63E8] px-4 py-2 text-[12px] font-bold text-[#1F63E8] hover:bg-[#EEF4FF]">
            {channel.action}
          </button>
        </Card>
      ))}
    </div>
    <Card>
      <CardTitle icon={LifeBuoy} title="Frequently asked questions" />
      <ul className="mt-3 space-y-2 text-[13px] text-[#4B5F7D]">
        <li className="rounded-lg bg-[#F8FAFD] p-3">How do I approve a pending leave request? Open Leave Management and use the Approve button on a request.</li>
        <li className="rounded-lg bg-[#F8FAFD] p-3">Where can I view my team's attendance? Open the Attendance page from the sidebar or the dashboard quick actions.</li>
        <li className="rounded-lg bg-[#F8FAFD] p-3">How do I generate a report? Open Reports and use Generate Report or Schedule Report.</li>
      </ul>
    </Card>
  </PageShell>
);

export default HelpSupport;
