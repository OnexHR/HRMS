import React, { useEffect, useMemo, useState } from "react";
import { Megaphone } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import LiveAnnouncement from "../components/LiveAnnouncement";
import AllAnnouncements, { type Announcement } from "../components/AllAnnouncement";
import Footer2 from "../../../components/Footer2";
import employeeApi from "../../../lib/employeeApi";

// Turns whatever the API sends into the shape the two components use.
// If your backend names a field differently, adjust it here only.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const firstString = (...values: unknown[]): string | null =>
  values.find((value): value is string => typeof value === "string") ?? null;

const dateString = (...values: unknown[]): string | null => {
  const value = values.find((item) => item !== null && item !== undefined);
  if (typeof value === "string") return value;
  if (typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalise = (value: unknown): Announcement => {
  if (!isRecord(value)) throw new Error("Announcements API returned an invalid item.");

  const publishedAt = dateString(value.publishedAt, value.startDate, value.createdAt);
  const expiresAt = dateString(value.expiresAt, value.expiryDate, value.endDate);
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : NaN;
  const status = typeof value.status === "string" ? value.status.toLowerCase() : "";
  const title = firstString(value.title) ?? "Untitled";

  return {
    id: firstString(value._id, value.id) ?? `${title}-${publishedAt ?? ""}`,
    title,
    message: firstString(value.message, value.description, value.content, value.body) ?? "",
    publishedAt,
    expiresAt,
    expired: status === "expired" || (!Number.isNaN(expiresMs) && expiresMs < Date.now()),
  };
};

const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "office-timings-updated",
    title: "Office Timings Updated",
    message: "From 1st December 2026, office timings will be 9:30 AM to 6:00 PM. Kindly follow the new schedule.",
    publishedAt: "2026-11-28",
    expiresAt: "2026-12-31",
    expired: false,
  },
  {
    id: "diwali-bonus",
    title: "Diwali Bonus Announcement",
    message: "This year's Diwali bonus will be credited with December salary.",
    publishedAt: "2026-11-15",
    expiresAt: "2026-12-31",
    expired: false,
  },
  {
    id: "annual-performance-review",
    title: "Annual Performance Review",
    message: "The performance review process for 2026 is now open.",
    publishedAt: "2026-10-01",
    expiresAt: "2026-12-31",
    expired: false,
  },
  {
    id: "team-building-event",
    title: "Team Building Event",
    message: "Join us for the Annual Team Building event on 25th November 2026.",
    publishedAt: "2026-10-20",
    expiresAt: "2026-11-25",
    expired: false,
  },
  {
    id: "new-leave-policy",
    title: "New Leave Policy",
    message: "Updated leave policy is now effective from 1st October 2026.",
    publishedAt: "2026-09-28",
    expiresAt: "2026-12-31",
    expired: false,
  },
  {
    id: "sports-day",
    title: "Sports Day Celebration",
    message: "Sports Day will be held on 15th September 2026.",
    publishedAt: "2026-09-01",
    expiresAt: "2026-09-30",
    expired: true,
  },
  {
    id: "employee-appreciation",
    title: "Employee Appreciation",
    message: "Thank you for your continued support!",
    publishedAt: "2026-08-15",
    expiresAt: "2026-09-15",
    expired: true,
  },
  {
    id: "system-maintenance-notice",
    title: "System Maintenance Notice",
    message: "HRMS will be under maintenance on 10th October 2026 from 10 PM to 12 AM.",
    publishedAt: "2026-10-08",
    expiresAt: "2026-10-10",
    expired: true,
  },
  {
    id: "office-holiday",
    title: "Office Holiday",
    message: "Office will remain closed on 5th September 2026 (Saturday).",
    publishedAt: "2026-09-01",
    expiresAt: "2026-09-05",
    expired: true,
  },
];

const Announcements: React.FC = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    employeeApi
      .get("/announcements")
      .then((res) => {
        const list = res.data?.announcements ?? res.data ?? [];
        if (!Array.isArray(list)) {
          throw new Error("Announcements API returned an invalid response.");
        }
        if (mounted) setItems(list.map(normalise));
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        console.error("Could not load announcements from the API; showing sample announcements.", loadError);
        setItems(DEMO_ANNOUNCEMENTS);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Newest active announcement is the "current" one.
  const current = useMemo(() => {
    const time = (v?: string | null) => (v ? new Date(v).getTime() || 0 : 0);
    return (
      items
        .filter((a) => !a.expired)
        .sort((a, b) => time(b.publishedAt) - time(a.publishedAt))[0] ?? null
    );
  }, [items]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#E6EDFF] via-[#EFF3FF] to-[#E3EAFF] text-gray-800">
      <Sidebar active="announcements" />

      <main className="ml-60 flex min-h-screen flex-1 flex-col">
        <Header hideBanner />

        <div className="flex-1 space-y-6 p-6 pt-5">
          <section className="relative flex min-h-[104px] shrink-0 items-center overflow-hidden rounded-2xl border border-[#B8C9EF] bg-gradient-to-r from-[#DCE7FF] via-[#E7EEFF] to-[#D5E2FF] px-6 py-3 shadow-[0_12px_30px_rgba(37,70,170,0.14)]">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-blue-300/20" />
            <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-blue-300/15" />
            <div className="relative flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#1D4ED8] shadow-sm">
                <Megaphone size={25} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h1 className="text-[24px] font-extrabold leading-tight text-[#14226B] sm:text-[26px]">
                  Announcements
                </h1>
                <p className="mt-1 text-[14px] font-medium text-[#1D2A78]">
                  Stay updated with the latest news and notifications from OnexHR.
                </p>
              </div>
            </div>
          </section>

          <LiveAnnouncement announcement={current} loading={loading} />
          <AllAnnouncements
            announcements={items.filter((announcement) => announcement.id !== current?.id)}
            loading={loading}
          />
        </div>

        <Footer2 />
      </main>
    </div>
  );
};

export default Announcements;