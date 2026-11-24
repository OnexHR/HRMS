import React from "react";
import {
  CheckCheck,
  CircleDashed,
  Clock3,
  Filter,
  Hourglass,
  ListChecks,
  Loader2,
  MessageSquareText,
  Paperclip,
  RotateCcw,
  Search,
  Star,
} from "lucide-react";
import employeeApi from "../../../lib/employeeApi";
import type { DemoEmployeeQueryAttachment } from "../../../lib/employeeQueryDemo";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import { formatWorkId } from "../../../lib/employeeTaskDemo";
import StyledSelect from "./StyledSelect";
import {
  EMPLOYEE_QUERIES_UPDATED_EVENT,
  getDemoEmployeeQueries,
} from "../../../lib/employeeQueryDemo";

type QueryStatus = "open" | "in_review" | "resolved" | "raised_again";

type MyQuery = {
  _id: string;
  message: string;
  status: QueryStatus;
  review?: string;
  reviewedAt?: string | null;
  createdAt?: string;
  task?: { title?: string; taskId?: string } | null;
  attachment?: DemoEmployeeQueryAttachment | null;
};

// pill   -> status chip used in the list and the detail card
// tile   -> background + border of the counter tile
// label  -> colour of the floating label on the counter tile
const STATUS_META: Record<
  QueryStatus,
  { label: string; pill: string; tile: string; labelColor: string; icon: typeof Star }
> = {
  open: {
    label: "Open",
    pill: "bg-amber-50 text-amber-600",
    tile: "border-amber-100 bg-[#FFFBE8]",
    labelColor: "text-amber-600",
    icon: Star,
  },
  in_review: {
    label: "In review",
    pill: "bg-blue-50 text-blue-600",
    tile: "border-blue-100 bg-[#EFF6FF]",
    labelColor: "text-blue-600",
    icon: CircleDashed,
  },
  resolved: {
    label: "Resolved",
    pill: "bg-emerald-50 text-emerald-600",
    tile: "border-emerald-100 bg-[#ECFDF5]",
    labelColor: "text-emerald-600",
    icon: CheckCheck,
  },
  raised_again: {
    label: "Raised again",
    pill: "bg-rose-50 text-rose-500",
    tile: "border-rose-100 bg-[#FFF0F0]",
    labelColor: "text-rose-500",
    icon: RotateCcw,
  },
};

const STATUS_ORDER: QueryStatus[] = ["open", "in_review", "raised_again", "resolved"];

function formatDate(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

// Counter tile with the label floating on the top edge.
const CounterTile: React.FC<{
  label: string;
  value: number;
  tile: string;
  labelColor: string;
  icon?: React.ReactNode;
}> = ({ label, value, tile, labelColor, icon }) => (
  <div className={`relative flex flex-col items-center rounded-2xl border px-3 pb-3 pt-5 text-center ${tile}`}>
    <span
      className={`absolute -top-3 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-0.5 text-[13px] font-bold shadow-sm ${labelColor}`}
    >
      {icon}
      {label}
    </span>
    <p className="text-[28px] font-extrabold leading-none text-[#14226B]">{value}</p>
  </div>
);

const AllQueries: React.FC = () => {
  const { employee } = useEmployeeAuth();
  const employeeId = employee?._id ?? employee?.employeeCode ?? "anonymous";
  const [queries, setQueries] = React.useState<MyQuery[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [demoMode, setDemoMode] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<QueryStatus | "all">("all");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const [attachmentLoading, setAttachmentLoading] = React.useState(false);
  const [attachmentError, setAttachmentError] = React.useState<string | null>(null);

  const loadQueries = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeeApi.get<{ queries: MyQuery[] }>("/queries");
      setQueries(res.data?.queries ?? []);
      setDemoMode(false);
    } catch (loadError) {
      console.error("Could not load queries from the API; showing locally saved queries.", loadError);
      try {
        setQueries(getDemoEmployeeQueries(employeeId));
        setDemoMode(true);
      } catch (storageError) {
        setQueries([]);
        setError(storageError instanceof Error ? storageError.message : "Could not load saved queries.");
      }
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  React.useEffect(() => {
    loadQueries();
    window.addEventListener(EMPLOYEE_QUERIES_UPDATED_EVENT, loadQueries);
    return () => {
      window.removeEventListener(EMPLOYEE_QUERIES_UPDATED_EVENT, loadQueries);
    };
  }, [loadQueries]);

  const filtered = queries.filter((query) => {
    const text = `${query.message} ${query.task?.title ?? ""} ${query.review ?? ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || query.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const active = filtered.find((query) => query._id === activeId) ?? filtered[0] ?? null;
  const activeAttachment = active?.attachment ?? null;

  React.useEffect(() => {
    let mounted = true;
    setAttachmentUrl("");
    setAttachmentError(null);

    if (!activeAttachment) {
      setAttachmentLoading(false);
      return () => {
        mounted = false;
      };
    }
    if (activeAttachment.dataUrl) {
      setAttachmentUrl(activeAttachment.dataUrl);
      setAttachmentLoading(false);
      return () => {
        mounted = false;
      };
    }
    if (!activeAttachment.key) {
      setAttachmentLoading(false);
      return () => {
        mounted = false;
      };
    }

    setAttachmentLoading(true);
    employeeApi
      .post<{ signedUrl?: string }>("/upload/get-download-url", { fileKey: activeAttachment.key })
      .then((response) => {
        if (!response.data?.signedUrl) throw new Error("The download service returned an invalid response.");
        if (mounted) setAttachmentUrl(response.data.signedUrl);
      })
      .catch((downloadError) => {
        console.error("Could not load query attachment.", downloadError);
        if (mounted) setAttachmentError("The attachment could not be opened.");
      })
      .finally(() => {
        if (mounted) setAttachmentLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeAttachment?.dataUrl, activeAttachment?.key]);

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, status) => {
    acc[status] = queries.filter((query) => query.status === status).length;
    return acc;
  }, {});

  const awaiting = queries.filter((query) => !query.review?.trim()).length;

  return (
    <section className={`${CARD} p-4`}>
      <div className="flex items-center gap-3">
        <MessageSquareText size={24} className="text-[#1D4ED8]" />
        <h3 className="text-[22px] font-extrabold text-[#14226B]">All Queries</h3>
        {demoMode && (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            Saved on this device
          </span>
        )}
      </div>

      {/* Counters */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <CounterTile
          label="Total"
          value={queries.length}
          tile="border-indigo-100 bg-[#EEF1FF]"
          labelColor="text-indigo-600"
        />
        {STATUS_ORDER.map((status) => {
          const { label, tile, labelColor, icon: Icon } = STATUS_META[status];
          return (
            <CounterTile
              key={status}
              label={label}
              value={counts[status] ?? 0}
              tile={tile}
              labelColor={labelColor}
              icon={<Icon size={13} />}
            />
          );
        })}
      </div>

      {/* Search */}
      <div className="mt-4 grid grid-cols-1 items-center gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <div className="flex items-center gap-3 rounded-full border border-blue-200 bg-white px-5 py-3 shadow-sm">
          <Search size={17} className="shrink-0 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your queries..."
            className="w-full bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
          />
        </div>
        <StyledSelect
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as QueryStatus | "all")}
          options={[
            { value: "all", label: "All statuses" },
            ...STATUS_ORDER.map((status) => ({ value: status, label: STATUS_META[status].label })),
          ]}
          ariaLabel="Filter queries by status"
          leadingIcon={<Filter size={16} />}
          triggerClassName="py-2.5 !border-blue-200"
        />
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Query list */}
        <div className="max-h-[20rem] min-h-[14rem] overflow-y-auto rounded-2xl border border-blue-200 bg-white">
          {loading ? (
            <p className="flex items-center gap-2 px-5 py-6 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              Loading queries…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400">
              {queries.length === 0
                ? "You have not raised any queries yet."
                : "No queries match your search."}
            </p>
          ) : (
            <ul>
              {filtered.map((query, index) => {
                const { label, pill } = STATUS_META[query.status] ?? STATUS_META.open;
                const isActive = query._id === active?._id;
                const hasReview = Boolean(query.review?.trim());

                return (
                  <li key={query._id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(query._id)}
                      className={`w-full border-b border-blue-100 px-5 py-4 text-left transition ${
                        isActive ? "bg-[#F1F7FF]" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 rounded-lg bg-[#EAF0FF] px-2 py-1 text-[11px] font-bold text-[#1D4ED8]">
                          Q-{String(index + 1).padStart(2, "0")}
                        </span>
                        <p className="line-clamp-2 text-[15px] font-bold text-[#14226B]">{query.message}</p>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-[11px] font-semibold ${pill}`}>
                          {label}
                        </span>
                        {hasReview ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-0.5 text-[11px] font-semibold text-emerald-600">
                            Reviewed
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-0.5 text-[11px] font-semibold text-gray-500">
                            Awaiting review
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Detail */}
        {!active ? (
          <div className="flex min-h-[14rem] items-center justify-center rounded-2xl border border-dashed border-blue-200 text-sm text-gray-400 lg:h-[20rem]">
            Nothing to show yet.
          </div>
        ) : (
          <div className="grid min-w-0 grid-rows-2 gap-3 lg:h-[20rem] lg:justify-self-end lg:w-full">
            <div className="min-h-[8rem] overflow-y-auto rounded-2xl border border-blue-200 bg-[#F8FAFF] p-4 lg:min-h-0">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-400">Your query</p>
                <span
                  className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-bold ${
                    (STATUS_META[active.status] ?? STATUS_META.open).pill
                  }`}
                >
                  {(STATUS_META[active.status] ?? STATUS_META.open).label}
                </span>
              </div>

              {activeAttachment && (
                <div className="mt-4 border-t border-blue-100 pt-3">
                  {attachmentUrl ? (
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-[#1D4ED8] transition hover:bg-blue-100"
                      title={activeAttachment.name}
                    >
                      <Paperclip size={15} className="shrink-0" />
                      <span className="truncate">{activeAttachment.name}</span>
                    </a>
                  ) : (
                    <p className={`flex items-center gap-2 text-xs ${attachmentError ? "text-rose-600" : "text-gray-400"}`}>
                      <Paperclip size={14} />
                      {attachmentLoading ? "Loading attachment..." : attachmentError ?? activeAttachment.name}
                    </p>
                  )}
                </div>
              )}

              <p className="mt-3 text-[16px] font-bold text-[#14226B]">{active.message}</p>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <ListChecks size={14} />
                  Work:{" "}
                  <span className="font-bold text-[#14226B]">
                    {formatWorkId(active.task?.taskId) ? `${formatWorkId(active.task?.taskId)} - ` : ""}
                    {active.task?.title ?? "General"}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock3 size={14} />
                  Raised: {formatDate(active.createdAt)}
                </span>
              </div>
            </div>

            <div
              className={`min-h-[8rem] overflow-y-auto rounded-2xl border p-4 lg:min-h-0 ${
                active.review?.trim()
                  ? "border-blue-200 bg-blue-50/60"
                  : "border-blue-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                {active.review?.trim() ? (
                  <CheckCheck size={18} className="text-[#1D4ED8]" />
                ) : (
                  <Hourglass size={18} className="text-gray-400" />
                )}
                <p className="text-[16px] font-bold text-[#14226B]">Manager review</p>
              </div>

              {active.review?.trim() ? (
                <>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {active.review}
                  </p>
                  {active.reviewedAt && (
                    <p className="mt-3 text-xs text-gray-500">Reviewed on {formatDateTime(active.reviewedAt)}</p>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-gray-500">
                  Your manager has not reviewed this query yet. You will see their response here.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {awaiting > 0 && !loading && (
        <p className="mt-3 text-xs text-gray-400">
          {awaiting} {awaiting === 1 ? "query is" : "queries are"} still waiting for a manager review.
        </p>
      )}
    </section>
  );
};

export default AllQueries;