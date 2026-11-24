import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, CirclePlus, Star, Ban, Scale } from "lucide-react";
import employeeApi from "../../../lib/employeeApi";

type LeaveType = {
  key: keyof typeof balanceMap;
  label: string;
  used: number;
  total: number | null;
  icon: React.ElementType;
  iconColor: string;
  barColor: string;
  tile: string;
};

const balanceMap = {
  casual: {
    label: "Casual Leave",
    icon: CalendarDays,
    iconColor: "text-[#1D4ED8]",
    barColor: "bg-[#1D5BFF]",
    tile: "bg-[#E4ECFF]",
  },
  sick: {
    label: "Sick Leave",
    icon: CirclePlus,
    iconColor: "text-green-600",
    barColor: "bg-green-500",
    tile: "bg-[#DDF6E6]",
  },
  earned: {
    label: "Earned Leave",
    icon: Star,
    iconColor: "text-violet-600",
    barColor: "bg-violet-600",
    tile: "bg-[#EEE3FF]",
  },
  unpaid: {
    label: "Unpaid Leave",
    icon: Ban,
    iconColor: "text-orange-500",
    barColor: "bg-orange-500",
    tile: "bg-[#FFE9D6]",
  },
} as const;

const emptyBalance = {
  casual: { total: 0, used: 0, remaining: 0 },
  sick: { total: 0, used: 0, remaining: 0 },
  earned: { total: 0, used: 0, remaining: 0 },
  unpaid: { total: 0, used: 0, remaining: 0 },
};

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const LeaveBalance: React.FC = () => {
  const [balance, setBalance] = useState<Record<string, { total: number; used: number; remaining: number }>>(emptyBalance);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    employeeApi
      .get("/leave/balance")
      .then((res) => {
        if (mounted) {
          setBalance(res.data?.balance ?? emptyBalance);
        }
      })
      .catch(() => {
        if (mounted) setBalance(emptyBalance);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const leaves = useMemo<LeaveType[]>(() =>
    (Object.keys(balanceMap) as Array<keyof typeof balanceMap>).map((key) => ({
      key,
      label: balanceMap[key].label,
      used: Number(balance?.[key]?.used ?? 0),
      total: key === "unpaid" ? null : Number(balance?.[key]?.total ?? 0),
      icon: balanceMap[key].icon,
      iconColor: balanceMap[key].iconColor,
      barColor: balanceMap[key].barColor,
      tile: balanceMap[key].tile,
    })),
    [balance],
  );

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex items-center gap-3">
        <Scale size={26} className="text-[#1D4ED8]" />
        <div>
          <h3 className="text-[22px] font-extrabold leading-tight text-[#14226B]">Leave Balance</h3>
          <p className="text-[13px] text-gray-500">Your current leave summary</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {leaves.map((leave) => {
          const pct = leave.total ? Math.min(100, (leave.used / leave.total) * 100) : 0;

          return (
            <div key={leave.key} className={`rounded-2xl px-4 pb-4 pt-4 ${leave.tile}`}>
              <div className="flex items-center gap-3">
                <leave.icon size={26} strokeWidth={1.9} className={`shrink-0 ${leave.iconColor}`} />
                <p className="whitespace-nowrap text-[14px] font-medium text-[#14226B]">{leave.label}</p>
              </div>

              <p className="mt-3 whitespace-nowrap text-[22px] font-extrabold leading-tight text-[#14226B]">
                {loading ? "--" : leave.total ? `${leave.used} of ${leave.total} days` : `${leave.used} taken`}
              </p>

              {leave.total ? (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/80">
                  <div className={`h-full rounded-full ${leave.barColor}`} style={{ width: `${pct}%` }} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default LeaveBalance;