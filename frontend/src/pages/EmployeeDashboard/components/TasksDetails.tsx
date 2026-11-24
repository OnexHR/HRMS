import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, CalendarDays, Check, ChevronDown, Paperclip } from "lucide-react";
import employeeApi from "../../../lib/employeeApi";
import { DEMO_EMPLOYEE_TASKS, formatWorkId, type DemoEmployeeTask } from "../../../lib/employeeTaskDemo";
import StyledSelect from "./StyledSelect";

type Priority = "High" | "Medium" | "Low";
type Status = "Not Started" | "In Progress" | "On Hold" | "Pending" | "Completed";

// The API may send plain strings or objects. `url` should be a ready-to-open
// (signed) link; without it the file is shown as a disabled "View" label.
type Attachment =
  | string
  | {
      name?: string;
      fileName?: string;
      originalName?: string;
      url?: string;
      key?: string;
    };

type Task = {
  _id: string;
  taskId?: string;
  title: string;
  // Free-text details of the task. Change this key if your API names it differently.
  description?: string | null;
  dueDate?: string | null;
  attachments?: Attachment[] | null;
  priority: Priority;
  status: Status;
};

const statusOptions: Status[] = ["Not Started", "In Progress", "On Hold", "Pending", "Completed"];

const dateLabel = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const priorityStyles: Record<Priority, string> = {
  High: "bg-rose-100 text-rose-600",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-green-100 text-green-700",
};

const statusStyles: Record<Status, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-700",
  "On Hold": "bg-violet-100 text-violet-700",
  Pending: "bg-rose-100 text-rose-600",
  Completed: "bg-green-100 text-green-700",
};

const normalizeAttachment = (a: Attachment) => {
  if (typeof a === "string") {
    const isLink = /^https?:\/\//i.test(a);
    const last = a.split("?")[0].split("/").pop() || a;
    let name = last;
    try {
      name = decodeURIComponent(last);
    } catch {
      /* keep raw name if it is not valid URI encoding */
    }
    return { name, url: isLink ? a : undefined };
  }
  const raw = a.name ?? a.fileName ?? a.originalName ?? a.key?.split("/").pop() ?? "Attachment";
  return { name: raw, url: a.url };
};

// Shared cell classes: header cells + body cells with light grid lines.
const TH =
  "sticky top-0 z-10 border-b border-r border-blue-100 bg-[#F3F7FF] px-3 py-3.5 text-center text-[13px] font-semibold text-[#14226B] last:border-r-0";
const TD = "border-b border-r border-blue-100 px-3 py-4 text-center align-middle break-words last:border-r-0";

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

type TaskDetailsProps = {
  // Called after a task status is updated successfully (e.g. to refresh the summary).
  onStatusChanged?: (demoTasks?: ReadonlyArray<Pick<DemoEmployeeTask, "status">>) => void;
};

const TaskDetails: React.FC<TaskDetailsProps> = ({ onStatusChanged }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [filter, setFilter] = useState<"All" | Status>("All");
  // Menu is rendered in a portal at fixed coordinates, so the scrollable table never clips it.
  const [menu, setMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const menuFor = menu?.id ?? null;

  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      try {
        const res = await employeeApi.get<{ tasks?: Task[] }>("/tasks");
        if (!mounted) return;
        const loadedTasks = res?.data?.tasks;
        if (Array.isArray(loadedTasks) && loadedTasks.length > 0) {
          setTasks(loadedTasks);
        } else {
          setTasks(DEMO_EMPLOYEE_TASKS);
          setDemoMode(true);
        }
      } catch (loadError) {
        if (mounted) {
          console.error("Could not load tasks from the API; showing sample tasks.", loadError);
          setTasks(DEMO_EMPLOYEE_TASKS);
          setDemoMode(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTasks();

    return () => {
      mounted = false;
    };
  }, []);

  // Close the actions menu on outside click, scroll or resize.
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (e.type === "mousedown" && target?.closest?.("[data-status-menu]")) return;
      setMenu(null);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu]);

  const handleStatusChange = async (taskId: string, nextStatus: Status) => {
    setMenu(null);
    if (demoMode) {
      const updatedTasks = tasks.map((task) =>
        task._id === taskId ? { ...task, status: nextStatus } : task,
      );
      setTasks(updatedTasks);
      onStatusChanged?.(updatedTasks);
      return;
    }

    setUpdatingId(taskId);
    setError(null);

    try {
      await employeeApi.patch(`/tasks/${taskId}/status`, { status: nextStatus });
      setTasks((current) => current.map((task) => (task._id === taskId ? { ...task, status: nextStatus } : task)));
      onStatusChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update task status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const visible = filter === "All" ? tasks : tasks.filter((task) => task.status === filter);

  return (
    <section className={`${CARD} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-[#1D4ED8]" />
          <h3 className="text-[22px] font-extrabold text-[#14226B]">Work details</h3>
          {demoMode && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Sample work
            </span>
          )}
        </div>

        {/* Status filter */}
        <div className="w-40">
          <StyledSelect
            value={filter}
            onChange={(nextStatus) => setFilter(nextStatus as "All" | Status)}
            options={[
              { value: "All", label: "All Status" },
              ...statusOptions.map((option) => ({ value: option, label: option })),
            ]}
            ariaLabel="Filter work by status"
            triggerClassName="py-2.5"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="task-details-scrollbar mt-4 max-h-[420px] overflow-auto rounded-xl border border-blue-100 bg-white">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-left [&_tbody_tr:last-child_td]:border-b-0">
          <thead>
            <tr>
              <th className={`${TH} w-[8%] rounded-tl-xl`}>Work ID</th>
              <th className={`${TH} w-[17%]`}>Work title</th>
              <th className={`${TH} w-[24%]`}>Work details</th>
              <th className={`${TH} w-[14%]`}>Due date</th>
              <th className={`${TH} w-[10%]`}>Priority</th>
              <th className={`${TH} w-[16%]`}>Employee Status</th>
              <th className={`${TH} w-[11%] whitespace-nowrap rounded-tr-xl`}>Attachments</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-gray-400">
                  Loading work...
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-gray-400">
                  {tasks.length === 0 ? "No work assigned." : "No work matches this status."}
                </td>
              </tr>
            ) : (
              visible.map((task) => (
                <tr key={task._id} className="text-sm">
                  <td className={`${TD} font-medium text-[#14226B]`}>
                    {formatWorkId(task.taskId) ?? "#"}
                  </td>

                  <td className={`${TD} font-bold leading-snug text-[#14226B]`}>{task.title}</td>

                  <td className={`${TD} text-gray-500`}>
                    <p className="line-clamp-3 whitespace-pre-wrap text-center text-[13px] leading-snug">
                      {task.description?.trim() ? task.description : "—"}
                    </p>
                  </td>

                  <td className={`${TD} font-medium text-[#14226B]`}>
                    <span className="flex flex-wrap items-center justify-center gap-x-1.5">
                      <CalendarDays size={14} className="shrink-0 text-gray-400" />
                      {dateLabel(task.dueDate)}
                    </span>
                  </td>

                  <td className={TD}>
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-4 py-1 text-xs font-semibold ${
                        priorityStyles[task.priority] ?? priorityStyles.Medium
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  <td className={TD}>
                    <button
                      type="button"
                      aria-label={`Actions for ${task.title}`}
                      aria-haspopup="menu"
                      aria-expanded={menuFor === task._id}
                      data-status-menu
                      disabled={updatingId === task._id}
                      onClick={(event) => {
                        if (menuFor === task._id) {
                          setMenu(null);
                          return;
                        }
                        const rect = event.currentTarget.getBoundingClientRect();
                        const menuWidth = 192;
                        const menuHeight = 48 + statusOptions.length * 38;
                        const top =
                          rect.bottom + menuHeight > window.innerHeight
                            ? rect.top - menuHeight - 4
                            : rect.bottom + 4;
                        setMenu({
                          id: task._id,
                          top: Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8)),
                          left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
                        });
                      }}
                      className={`mx-auto inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:ring-4 hover:ring-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-60 ${
                        statusStyles[task.status] ?? statusStyles.Pending
                      }`}
                    >
                      {task.status}
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${menuFor === task._id ? "rotate-180" : ""}`}
                      />
                    </button>
                  </td>

                  <td className={TD}>
                    {task.attachments && task.attachments.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        {task.attachments.map(normalizeAttachment).map((file, i, arr) => {
                          const label = arr.length > 1 ? `View ${i + 1}` : "View";
                          const cls = "inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap";
                          return file.url ? (
                            <a
                              key={`${file.name}-${i}`}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={file.name}
                              className={`${cls} text-[#1D4ED8] hover:underline`}
                            >
                              <Paperclip size={12} className="shrink-0" />
                              {label}
                            </a>
                          ) : (
                            <span
                              key={`${file.name}-${i}`}
                              title={`${file.name} (no link available)`}
                              className={`${cls} text-gray-400`}
                            >
                              <Paperclip size={12} className="shrink-0" />
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {menu &&
        createPortal(
          <div
            data-status-menu
            role="menu"
            aria-label="Work status actions"
            style={{ top: menu.top, left: menu.left }}
            className="fixed z-50 w-48 rounded-2xl border border-blue-100 bg-white p-2 text-left shadow-[0_16px_40px_rgba(20,34,107,0.2)] ring-1 ring-blue-50"
          >
            <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
              Actions
            </p>
            {statusOptions.map((option) => {
              const current = tasks.find((t) => t._id === menu.id)?.status;
              return (
                <button
                  key={option}
                  type="button"
                  role="menuitem"
                  onClick={() => handleStatusChange(menu.id, option)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-[#14226B] transition hover:bg-blue-50"
                >
                  <span>Set to {option}</span>
                  {current === option && <Check size={14} className="text-[#1D4ED8]" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </section>
  );
};

export default TaskDetails;