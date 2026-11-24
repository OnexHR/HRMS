import React, { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Gift,
  Info,
  List,
  Megaphone,
  Search,
  Star,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";

// Shape used by the Announcements page. The fields are normalised from the API
// in Announcements.tsx, so changing the backend field names only touches that file.
export type Announcement = {
  id: string;
  title: string;
  message: string;
  publishedAt?: string | null;
  expiresAt?: string | null;
  expired: boolean;
};

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Picks an icon from the title, falling back to the megaphone.
const iconFor = (title: string, size = 22, strokeWidth = 2): React.ReactNode => {
  const t = title.toLowerCase();
  const iconProps = { size, strokeWidth };
  if (/bonus|gift|reward/.test(t)) return <Gift {...iconProps} />;
  if (/performance|review|appraisal|growth/.test(t)) return <BarChart3 {...iconProps} />;
  if (/team|event|party|celebration|meet/.test(t) && !/sports/.test(t)) return <UsersRound {...iconProps} />;
  if (/leave|policy|document|guideline/.test(t)) return <FileText {...iconProps} />;
  if (/sport|trophy|award|winner/.test(t)) return <Trophy {...iconProps} />;
  if (/appreciation|thank|star/.test(t)) return <Star {...iconProps} />;
  if (/maintenance|system|notice|downtime/.test(t)) return <Info {...iconProps} />;
  if (/holiday|closed|festival/.test(t)) return <CalendarDays {...iconProps} />;
  return <Megaphone {...iconProps} />;
};

const Row: React.FC<{
  item: Announcement;
  onOpen: () => void;
}> = ({ item, onOpen }) => {
  const expired = item.expired;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition ${
        expired
          ? "border-gray-200 bg-[#F3F5F9]/80 hover:bg-[#EEF1F6]"
          : "border-blue-100 bg-white hover:shadow-[0_8px_24px_rgba(37,70,170,0.12)]"
      }`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          expired ? "bg-gray-200 text-gray-500" : "bg-[#E4ECFF] text-[#1D4ED8]"
        }`}
      >
        {iconFor(item.title, 22, expired ? 2 : 2.2)}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-[18px] font-bold leading-snug ${expired ? "text-gray-500" : "text-[#14226B]"}`}>
          {item.title}
        </p>

        <p
          className={`mt-0.5 text-[15px] line-clamp-1 ${
            expired ? "text-gray-500" : "text-[#1E2A63]"
          }`}
        >
          {item.message}
        </p>

        <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] ${expired ? "text-gray-400" : "text-[#14226B]"}`}>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} />
            {formatDate(item.publishedAt)}
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1.5">
            <Clock3 size={14} />
            Expires: {formatDate(item.expiresAt)}
          </span>
        </div>
      </div>

      <span
        className={`hidden shrink-0 rounded-full px-4 py-1 text-[13px] font-bold sm:inline-block ${
          expired ? "bg-gray-200 text-gray-500" : "bg-[#D9E6FF] text-[#1D4ED8]"
        }`}
      >
        {expired ? "Expired" : "Active"}
      </span>

      <ChevronRight
        size={22}
        className={`shrink-0 ${expired ? "text-gray-400" : "text-[#1D4ED8]"}`}
      />
    </button>
  );
};

const AllAnnouncements: React.FC<{ announcements: Announcement[]; loading?: boolean }> = ({
  announcements,
  loading,
}) => {
  const [search, setSearch] = useState("");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [page, setPage] = useState(1);

  const { active, expired } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const time = (v?: string | null) => (v ? new Date(v).getTime() || 0 : 0);

    const matches = announcements.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.message.toLowerCase().includes(q),
    );

    return {
      // Newest first within each group.
      active: matches.filter((a) => !a.expired).sort((a, b) => time(b.publishedAt) - time(a.publishedAt)),
      expired: matches.filter((a) => a.expired).sort((a, b) => time(b.expiresAt) - time(a.expiresAt)),
    };
  }, [announcements, search]);

  const nothing = active.length === 0 && expired.length === 0;

  // Each page shows up to 4 announcements from each status group.
  const perGroup = 4;
  const totalPages = Math.max(1, Math.ceil(Math.max(active.length, expired.length) / perGroup));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * perGroup;
  const pageActive = active.slice(from, from + perGroup);
  const pageExpired = expired.slice(from, from + perGroup);

  // Back to page 1 whenever the search or filter changes.
  useEffect(() => {
    if (!selectedAnnouncement) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedAnnouncement(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedAnnouncement]);

  const goTo = (n: number) => {
    setPage(n);
    setSelectedAnnouncement(null);
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === totalPages || Math.abs(n - currentPage) <= 1,
  );

  const pageBtn =
    "flex h-9 min-w-[38px] items-center justify-center rounded-lg border px-2 text-sm font-semibold transition";

  return (
    <>
    <section className={`${CARD} p-5`}>
      {/* Header: title + search */}
      <div className="flex flex-col gap-3 rounded-xl bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <List size={26} className="text-[#1D4ED8]" />
          <h3 className="text-[22px] font-extrabold text-[#14226B]">All Announcements</h3>
        </div>

        <div className="flex w-full min-w-0 items-center justify-end sm:flex-1">
          <label className="flex h-[52px] min-w-0 flex-1 items-center gap-3 rounded-full border border-[#C9D8F7] bg-white px-5 shadow-[0_6px_18px_rgba(37,70,170,0.10)] transition focus-within:border-[#1D5BFF] focus-within:ring-4 focus-within:ring-blue-100 sm:max-w-[384px]">
            <Search size={21} className="shrink-0 text-[#1D4ED8]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
                setSelectedAnnouncement(null);
              }}
              placeholder="Search announcements..."
              aria-label="Search announcements"
              className="w-full bg-transparent text-sm text-[#14226B] outline-none placeholder:text-[#8995AD]"
            />
          </label>
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">Loading announcements...</p>
        ) : nothing ? (
          <p className="py-8 text-center text-sm text-gray-400">
            {announcements.length === 0 ? "No announcements yet." : "No announcements match your search."}
          </p>
        ) : (
          <>
            {pageActive.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-3 text-[22px] font-extrabold text-[#14226B]">
                  <BadgeCheck size={23} className="shrink-0 fill-[#1D5BFF] text-white" strokeWidth={2.2} />
                  Active Announcements
                </h4>
                <div className="space-y-3">
                  {pageActive.map((item) => (
                    <Row key={item.id} item={item} onOpen={() => setSelectedAnnouncement(item)} />
                  ))}
                </div>
              </div>
            )}

            {pageExpired.length > 0 && (
              <div>
                <h4 className="mb-3 flex items-center gap-3 text-[22px] font-extrabold text-gray-500">
                  <Clock3 size={21} className="rounded-full bg-gray-500 p-0.5 text-white" />
                  Expired Announcements
                </h4>
                <div className="space-y-3">
                  {pageExpired.map((item) => (
                    <Row key={item.id} item={item} onOpen={() => setSelectedAnnouncement(item)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Page numbers */}
      {!loading && !nothing && totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => goTo(currentPage - 1)}
            className={`${pageBtn} border-blue-100 bg-white text-[#14226B] hover:bg-blue-50 disabled:opacity-40`}
          >
            <ChevronLeft size={16} />
          </button>

          {pageNumbers.map((n, i) => (
            <React.Fragment key={n}>
              {i > 0 && n - pageNumbers[i - 1] > 1 && <span className="px-1 text-gray-400">…</span>}
              <button
                type="button"
                onClick={() => goTo(n)}
                className={`${pageBtn} ${
                  n === currentPage
                    ? "employee-primary-action border-transparent"
                    : "border-blue-100 bg-white text-[#14226B] hover:bg-blue-50"
                }`}
              >
                {n}
              </button>
            </React.Fragment>
          ))}

          <button
            type="button"
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => goTo(currentPage + 1)}
            className={`${pageBtn} border-blue-100 bg-white text-[#14226B] hover:bg-blue-50 disabled:opacity-40`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
    {selectedAnnouncement && (
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-[#08173A]/55 p-4 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedAnnouncement(null);
        }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
          className="w-full max-w-xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_24px_70px_rgba(8,23,58,0.3)]"
        >
          <div className="flex items-start justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-[#EAF0FF] to-[#DCE7FF] px-6 py-5">
            <div className="flex min-w-0 items-center gap-4">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  selectedAnnouncement.expired
                    ? "bg-gray-200 text-gray-500"
                    : "bg-[#E4ECFF] text-[#1D4ED8]"
                }`}
              >
                {iconFor(selectedAnnouncement.title, 24)}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#52658F]">
                  Announcement details
                </p>
                <h2 id="announcement-modal-title" className="mt-1 text-xl font-extrabold text-[#14226B]">
                  {selectedAnnouncement.title}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAnnouncement(null)}
              aria-label="Close announcement details"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#14226B] transition hover:bg-white hover:text-[#1D5BFF]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                selectedAnnouncement.expired
                  ? "bg-gray-200 text-gray-600"
                  : "bg-[#DCE8FF] text-[#1761E9]"
              }`}
            >
              {selectedAnnouncement.expired ? "Expired" : "Active"}
            </span>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#1E2A63]">
              {selectedAnnouncement.message || "No additional details provided."}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-[#F5F8FF] p-4">
                <p className="text-xs font-semibold text-slate-500">Published</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#14226B]">
                  <CalendarDays size={16} />
                  {formatDate(selectedAnnouncement.publishedAt)}
                </p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-[#F5F8FF] p-4">
                <p className="text-xs font-semibold text-slate-500">Expires</p>
                <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#14226B]">
                  <Clock3 size={16} />
                  {formatDate(selectedAnnouncement.expiresAt)}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500">Announcement ID: {selectedAnnouncement.id}</p>
          </div>
        </section>
      </div>
    )}
    </>
  );
};

export default AllAnnouncements;