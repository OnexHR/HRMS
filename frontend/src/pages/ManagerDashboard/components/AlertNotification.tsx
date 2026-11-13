// import React, { useState } from "react";
// import { Bell, AlertTriangle, Info, CheckCircle2, Circle } from "lucide-react";

// type AlertItem = {
//   icon: React.ElementType;
//   iconColor: string;
//   iconBg: string;
//   text: string;
//   time: string;
//   category: "Absent" | "Abnormal" | "Exceeded Break Time" | "Other";
// };

// const AlertsNotifications: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<
//     "All" | "Absent" | "Abnormal" | "Exceeded Break Time"
//   >("All");

//   const alerts: AlertItem[] = [
//     {
//       icon: AlertTriangle,
//       iconColor: "text-amber-500",
//       iconBg: "bg-amber-50",
//       text: "Rahul Sharma has exceeded break duration",
//       time: "10:24 AM",
//       category: "Exceeded Break Time",
//     },
//     {
//       icon: Circle,
//       iconColor: "text-rose-500 fill-rose-500",
//       iconBg: "bg-rose-50",
//       text: "Neha Gupta is absent today",
//       time: "09:15 AM",
//       category: "Absent",
//     },
//     {
//       icon: CheckCircle2,
//       iconColor: "text-green-600",
//       iconBg: "bg-green-50",
//       text: "Priya Mehta's leave was approved",
//       time: "Yesterday",
//       category: "Other",
//     },
//     {
//       icon: Info,
//       iconColor: "text-blue-500",
//       iconBg: "bg-blue-50",
//       text: "Amit Verma's attendance needs correction",
//       time: "Yesterday",
//       category: "Abnormal",
//     },
//     {
//       icon: Info,
//       iconColor: "text-blue-500",
//       iconBg: "bg-blue-50",
//       text: "Karan Mehta requested a leave",
//       time: "2 days ago",
//       category: "Other",
//     },
//   ];

//   const tabs: Array<"All" | "Absent" | "Abnormal" | "Exceeded Break Time"> = [
//     "All",
//     "Absent",
//     "Abnormal",
//     "Exceeded Break Time",
//   ];

//   const filteredAlerts =
//     activeTab === "All"
//       ? alerts
//       : alerts.filter((alert) => alert.category === activeTab);

//   return (
//     <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <Bell size={20} className="text-[#10284A]" />
//           <h3 className="text-lg font-semibold text-[#10284A]">
//             Alerts &amp; Notifications
//           </h3>
//         </div>

//         <button className="text-sm font-medium text-[#2459A6] hover:underline">
//           View All
//         </button>
//       </div>

//       <div className="mt-4 flex flex-wrap gap-2">
//         {tabs.map((tab) => (
//           <button
//             key={tab}
//             type="button"
//             onClick={() => setActiveTab(tab)}
//             className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
//               activeTab === tab
//                 ? "bg-[#2459A6] text-white"
//                 : "bg-gray-100 text-gray-600 hover:bg-gray-200"
//             }`}
//           >
//             {tab}
//           </button>
//         ))}
//       </div>

//       <div className="mt-4 divide-y divide-gray-100">
//         {filteredAlerts.map((alert, index) => (
//           <div key={index} className="flex items-start gap-3 py-3">
//             <div
//               className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${alert.iconBg}`}
//             >
//               <alert.icon size={16} className={alert.iconColor} />
//             </div>

//             <div>
//               <p className="text-sm font-medium text-[#10284A]">
//                 {alert.text}
//               </p>
//               <p className="mt-0.5 text-xs text-gray-500">{alert.time}</p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </section>
//   );
// };

// export default AlertsNotifications;

import React, { useState } from "react";
import { Bell, AlertTriangle, Info, CheckCircle2, Circle } from "lucide-react";

type Category = "Absent" | "Abnormal" | "Exceeded Break Time" | "Other";
type AlertEntry = { category: string; text: string; time: string };

const CATEGORY_STYLE: Record<Category, { icon: React.ElementType; iconColor: string; iconBg: string }> = {
  Absent: { icon: Circle, iconColor: "text-rose-500 fill-rose-500", iconBg: "bg-rose-50" },
  "Exceeded Break Time": { icon: AlertTriangle, iconColor: "text-amber-500", iconBg: "bg-amber-50" },
  Abnormal: { icon: Info, iconColor: "text-blue-500", iconBg: "bg-blue-50" },
  Other: { icon: CheckCircle2, iconColor: "text-green-600", iconBg: "bg-green-50" },
};

const TABS: Array<"All" | Category> = ["All", "Absent", "Abnormal", "Exceeded Break Time"];

const AlertsNotifications: React.FC<{ alerts?: AlertEntry[]; loading?: boolean }> = ({
  alerts,
  loading,
}) => {
  const [activeTab, setActiveTab] = useState<"All" | Category>("All");
  const items = alerts ?? [];

  const filtered = activeTab === "All" ? items : items.filter((a) => a.category === activeTab);

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={20} className="text-[#10284A]" />
          <h3 className="text-lg font-semibold text-[#10284A]">
            Alerts &amp; Notifications
          </h3>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === tab
                ? "bg-[#2459A6] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4 divide-y divide-gray-100">
        {loading ? (
          <p className="py-4 text-sm text-gray-400">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-sm text-gray-400">No alerts right now.</p>
        ) : (
          filtered.map((alert, index) => {
            const style = CATEGORY_STYLE[alert.category as Category] ?? CATEGORY_STYLE.Other;
            return (
              <div key={index} className="flex items-start gap-3 py-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${style.iconBg}`}
                >
                  <style.icon size={16} className={style.iconColor} />
                </div>

                <div>
                  <p className="text-sm font-medium text-[#10284A]">
                    {alert.text}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{alert.time}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default AlertsNotifications;
