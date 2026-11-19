import React from "react";
import {
  MessageSquareText,
  CircleDashed,
  CheckCheck,
  RotateCcw,
  PenLine,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import SimpleCalendar from "../components/Simplecalendar";
import WriteReview from "../components/WriteReview";
import type { ReviewableQuery } from "../components/WriteReview";
import employeeApi from "../../../lib/employeeApi";

type QueryRow = {
  _id: string;
  message: string;
  status: "open" | "in_review" | "resolved" | "raised_again";
  createdAt?: string;
  employee?: { firstName?: string; lastName?: string; department?: string; employeeCode?: string };
  task?: { title?: string; taskId?: string };
};

type CalendarEvent = {
  id: string;
  title: string;
  type: "task" | "meeting" | "query";
  date: string;
  status?: string;
};

const ManagerQueries: React.FC = () => {
  const [queries, setQueries] = React.useState<QueryRow[]>([]);
  const [stats, setStats] = React.useState<Record<string, number>>({ total: 0, open: 0, inReview: 0, resolved: 0, raisedAgain: 0 });
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reviewingId, setReviewingId] = React.useState<string | null>(null);

  const loadCalendarEvents = React.useCallback(async (month?: string) => {
    const res = await employeeApi.get<{ events: CalendarEvent[] }>('/calendar/events', {
      params: month ? { month } : {},
    });
    setEvents(res.data.events ?? []);
  }, []);

  const loadQueries = React.useCallback(async () => {
    try {
      const [teamRes, statRes] = await Promise.all([
        employeeApi.get<{ queries: QueryRow[] }>("/queries/team"),
        employeeApi.get<{ total: number; open: number; inReview: number; resolved: number; raisedAgain: number }>("/queries/stats"),
      ]);
      setQueries(teamRes.data.queries ?? []);
      setStats({
        total: statRes.data.total ?? 0,
        open: statRes.data.open ?? 0,
        inReview: statRes.data.inReview ?? 0,
        resolved: statRes.data.resolved ?? 0,
        raisedAgain: statRes.data.raisedAgain ?? 0,
      });
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not load queries.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadQueries();
    loadCalendarEvents().catch(() => {
      /* the calendar is a secondary panel; queries still render */
    });
  }, [loadQueries, loadCalendarEvents]);

  const openReview = (queryId: string) => {
    setReviewingId(queryId);
    document
      .getElementById("write-review-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const statusLabel: Record<string, string> = {
    open: "Open",
    in_review: "In review",
    resolved: "Resolved",
    raised_again: "Raised again",
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar active="query" />

      <main className="ml-60">
        <Header />

        <div className="space-y-6 p-6">
          <h1 className="text-2xl font-bold text-[#10284A]">Manager Queries</h1>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <SimpleCalendar events={events} onMonthChange={loadCalendarEvents} />
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquareText size={20} className="text-[#10284A]" />
                  <h3 className="text-lg font-semibold text-[#10284A]">Queries</h3>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {loading ? (
                  <div className="text-sm text-gray-400">Loading queries…</div>
                ) : error ? (
                  <div className="text-sm text-rose-600">{error}</div>
                ) : queries.length === 0 ? (
                  <div className="text-sm text-gray-400">No team queries yet.</div>
                ) : (
                  queries.slice(0, 5).map((query) => {
                    const person = query.employee ? `${query.employee.firstName ?? ""} ${query.employee.lastName ?? ""}`.trim() : "Unknown";
                    return (
                      <div key={query._id} className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2">
                        <div>
                          <p className="text-sm font-medium text-[#10284A]">{query.message}</p>
                          <p className="text-xs text-gray-500">{person} • {query.task?.title ?? "General"}</p>
                        </div>
                        <span className="text-xs rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-600">{statusLabel[query.status] || query.status}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total queries", value: stats.total, icon: MessageSquareText, tint: "bg-blue-50 text-[#2459A6]" },
              { label: "Queries left for review", value: stats.inReview, icon: CircleDashed, tint: "bg-amber-50 text-amber-600" },
              { label: "Queries resolved", value: stats.resolved, icon: CheckCheck, tint: "bg-green-50 text-green-600" },
              { label: "Queries raised again", value: stats.raisedAgain, icon: RotateCcw, tint: "bg-rose-50 text-rose-500" },
            ].map(({ label, value, icon: Icon, tint }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tint}`}><Icon size={18} /></div>
                <div>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-0.5 text-xl font-bold text-[#10284A]">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-[#10284A]">All queries</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-medium text-gray-400">
                    <th className="pb-3 pr-4">Query</th>
                    <th className="pb-3 pr-4">Task</th>
                    <th className="pb-3 pr-4">From</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queries.map((query) => (
                    <tr key={query._id} className="text-sm">
                      <td className="py-3 pr-4 text-gray-700">{query.message}</td>
                      <td className="py-3 pr-4 text-gray-600">{query.task?.title ?? "General"}</td>
                      <td className="py-3 pr-4 text-gray-600">{`${query.employee?.firstName ?? ""} ${query.employee?.lastName ?? ""}`.trim() || "Unknown"}</td>
                      <td className="py-3 pr-4"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{statusLabel[query.status] || query.status}</span></td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => openReview(query._id)}
                          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#2459A6] transition hover:bg-gray-50"
                        >
                          <PenLine size={13} />
                          Write Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div id="write-review-section">
            <WriteReview
              queries={queries as ReviewableQuery[]}
              loading={loading}
              activeId={reviewingId}
              onActiveIdChange={setReviewingId}
              onReviewed={loadQueries}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManagerQueries;
