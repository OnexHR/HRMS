import React from "react";
import {
  CheckCheck,
  CircleDashed,
  Clock3,
  Hourglass,
  ListChecks,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Search,
  Star,
} from "lucide-react";
import employeeApi from "../../../lib/employeeApi";

type QueryStatus = "open" | "in_review" | "resolved" | "raised_again";

type MyQuery = {
  _id: string;
  message: string;
  status: QueryStatus;
  review?: string;
  reviewedAt?: string | null;
  createdAt?: string;
  task?: { title?: string; taskId?: string } | null;
};

const STATUS_META: Record<QueryStatus, { label: string; pill: string; box: string; icon: typeof Star }> = {
  open: { label: "Open", pill: "bg-amber-50 text-amber-600", box: "border-amber-200 bg-amber-50", icon: Star },
  in_review: { label: "In review", pill: "bg-blue-50 text-blue-600", box: "border-blue-200 bg-blue-50", icon: CircleDashed },
  resolved: { label: "Resolved", pill: "bg-emerald-50 text-emerald-600", box: "border-emerald-200 bg-emerald-50", icon: CheckCheck },
  raised_again: { label: "Raised again", pill: "bg-rose-50 text-rose-500", box: "border-rose-200 bg-rose-50", icon: RotateCcw },
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

// A mismatched route answers with an HTML page, so there is no message to read -
// surface the status instead of hiding behind the generic fallback.
function describeError(err: any, fallback: string) {
  const status = err?.response?.status;
  if (status && !err?.response?.data?.message) {
    return `${fallback} (HTTP ${status} ${err?.response?.statusText ?? ""}`.trim() + ")";
  }
  return err?.response?.data?.message || fallback;
}

const AllQueries: React.FC = () => {
  const [queries, setQueries] = React.useState<MyQuery[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const loadQueries = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await employeeApi.get<{ queries: MyQuery[] }>("/queries");
      setQueries(res.data?.queries ?? []);
    } catch (err: any) {
      setQueries([]);
      setError(describeError(err, "Could not load your queries."));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadQueries();
  }, [loadQueries]);

  const filtered = queries.filter((query) => {
    const text = `${query.message} ${query.task?.title ?? ""} ${query.review ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const active = queries.find((query) => query._id === activeId) ?? filtered[0] ?? queries[0] ?? null;

  const counts = STATUS_ORDER.reduce<Record<string, number>>((acc, status) => {
    acc[status] = queries.filter((query) => query.status === status).length;
    return acc;
  }, {});

  const awaiting = queries.filter((query) => !query.review?.trim()).length;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <MessageSquareText size={24} className="text-[#10284A]" />
        <h3 className="text-[22px] font-bold text-[#10284A]">All Queries</h3>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="flex flex-col items-center rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-3.5 text-center">
          <p className="py-0.5 text-sm font-semibold text-indigo-600">Total</p>
          <p className="mt-2 text-2xl font-bold text-[#10284A]">{queries.length}</p>
        </div>
        {STATUS_ORDER.map((status) => {
          const { label, pill, box, icon: Icon } = STATUS_META[status];
          return (
            <div key={status} className={`flex flex-col items-center rounded-xl border px-3 py-3.5 text-center ${box}`}>
              <div className={`flex w-fit items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold ${pill.split(" ")[1]}`}>
                <Icon size={13} />
                {label}
              </div>
              <p className="mt-2 text-2xl font-bold text-[#10284A]">{counts[status] ?? 0}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5">
        <Search size={16} className="shrink-0 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your queries..."
          className="w-full bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
        />
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-3 grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="max-h-[26rem] overflow-y-auto rounded-xl border border-gray-100">
          {loading ? (
            <p className="flex items-center gap-2 px-4 py-6 text-sm text-gray-400">
              <Loader2 size={16} className="animate-spin" />
              Loading queries…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400">
              {queries.length === 0
                ? "You have not raised any queries yet."
                : "No queries match your search."}
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtered.map((query) => {
                const { label, pill } = STATUS_META[query.status] ?? STATUS_META.open;
                const isActive = query._id === active?._id;
                const hasReview = Boolean(query.review?.trim());

                return (
                  <li key={query._id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(query._id)}
                      className={`w-full px-4 py-3 text-left transition ${
                        isActive ? "bg-blue-50/70" : "hover:bg-gray-50"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-medium text-[#10284A]">{query.message}</p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill}`}>
                          {label}
                        </span>
                        {hasReview ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                            Reviewed
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
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

        {!active ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
            Nothing to show yet.
          </div>
        ) : (
          <div className="min-w-0">
            <div className="rounded-xl border border-gray-100 bg-[#F8FAFD] p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Your query</p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    (STATUS_META[active.status] ?? STATUS_META.open).pill
                  }`}
                >
                  {(STATUS_META[active.status] ?? STATUS_META.open).label}
                </span>
              </div>

              <p className="mt-2 text-sm font-medium text-[#10284A]">{active.message}</p>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <ListChecks size={12} />
                  Task: <span className="font-medium text-[#10284A]">{active.task?.title ?? "General"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock3 size={12} />
                  Raised: {formatDate(active.createdAt)}
                </span>
              </div>
            </div>

            <div
              className={`mt-4 rounded-xl border p-4 ${
                active.review?.trim()
                  ? "border-blue-100 bg-blue-50/60"
                  : "border-dashed border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2">
                {active.review?.trim() ? (
                  <CheckCheck size={16} className="text-[#2459A6]" />
                ) : (
                  <Hourglass size={16} className="text-gray-400" />
                )}
                <p className="text-sm font-semibold text-[#10284A]">Manager review</p>
              </div>

              {active.review?.trim() ? (
                <>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {active.review}
                  </p>
                  {active.reviewedAt && (
                    <p className="mt-3 text-xs text-gray-500">Reviewed on {formatDateTime(active.reviewedAt)}</p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
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