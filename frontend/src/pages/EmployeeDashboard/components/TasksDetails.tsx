import React, { useEffect, useState } from "react";
import { ClipboardList, CalendarDays, Paperclip } from "lucide-react";
import employeeApi from "../../../lib/employeeApi";

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
  High: "bg-rose-50 text-rose-500",
  Medium: "bg-amber-50 text-amber-600",
  Low: "bg-green-50 text-green-600",
};

const statusStyles: Record<Status, string> = {
  "Not Started": "bg-gray-100 text-gray-500",
  "In Progress": "bg-blue-50 text-blue-600",
  "On Hold": "bg-violet-50 text-violet-600",
  Pending: "bg-amber-50 text-amber-600",
  Completed: "bg-emerald-50 text-emerald-600",
};

const normalizeAttachment = (a: Attachment) => {
  if (typeof a === "string") {
    const isLink = /^https?:\/\//i.test(a);
    const last = a.split("?")[0].split("/").pop() || a;
    let name = last;
    try {
      name = decodeURIComponent(last);
    } catch (e) {
      /* keep raw name if it is not valid URI encoding */
    }
    return { name, url: isLink ? a : undefined };
  }
  const raw = a.name ?? a.fileName ?? a.originalName ?? a.key?.split("/").pop() ?? "Attachment";
  return { name: raw, url: a.url };
};

// Shared cell classes give every field its own bordered box.
const TH =
  "border-b border-r border-gray-200 bg-[#F8FAFD] px-2 py-3 text-center text-[13px] font-semibold text-gray-500 last:border-r-0";
const TD = "border-b border-r border-gray-200 px-2 py-4 text-center align-middle break-words last:border-r-0";

type TaskDetailsProps = {
  // Called after a task status is updated successfully (e.g. to refresh the summary).
  onStatusChanged?: () => void;
};

const TaskDetails: React.FC<TaskDetailsProps> = ({ onStatusChanged }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadTasks = async () => {
      try {
        const res = await employeeApi.get("/tasks");
        if (mounted) setTasks((res?.data?.tasks ?? []) as Task[]);
      } catch (e) {
        if (mounted) setTasks([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadTasks();

    return () => {
      mounted = false;
    };
  }, []);

  const handleStatusChange = async (taskId: string, nextStatus: Status) => {
    setUpdatingId(taskId);
    setError(null);

    try {
      await employeeApi.patch(`/tasks/${taskId}/status`, { status: nextStatus });
      setTasks((current) => current.map((task) => (task._id === taskId ? { ...task, status: nextStatus } : task)));
      onStatusChanged?.();
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not update task status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Resolve a fresh signed url on click for attachments without one (or whose url
  // has expired). Open a blank tab synchronously so the popup blocker allows it,
  // then point it at the fetched url; close it and show an error on failure.
  const handleAttachmentClick = async (e: React.MouseEvent, taskId: string, index: number) => {
    e.preventDefault();
    const win = window.open("", "_blank");
    try {
      const { data } = await employeeApi.get(`/tasks/${taskId}/attachments/${index}/url`);
      const url = data?.url;
      if (win) {
        if (url) {
          win.location = url;
        } else {
          win.close();
          setError("Could not open the file. Please try again.");
        }
      }
    } catch (err) {
      win?.close();
      setError("Could not open the file. Please try again.");
    }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <ClipboardList size={22} className="text-[#10284A]" />
        <h3 className="text-xl font-semibold text-[#10284A]">Task details</h3>
      </div>

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full table-fixed border-collapse text-left [&_tbody_tr:last-child_td]:border-b-0">
          <thead>
            <tr>
              <th className={`${TH} w-[8%]`}>Task Id</th>
              <th className={`${TH} w-[17%]`}>Task title</th>
              <th className={`${TH} w-[23%]`}>Task details</th>
              <th className={`${TH} w-[14%]`}>Due date</th>
              <th className={`${TH} w-[11%]`}>Priority</th>
              <th className={`${TH} w-[15%]`}>Employee Status</th>
              <th className={`${TH} w-[12%] whitespace-nowrap`}>Attachments</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-gray-400">
                  Loading tasks...
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-sm text-gray-400">
                  No tasks assigned.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task._id} className="text-sm">
                  <td className={TD}>
                    <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[#2459A6]">
                      {task.taskId ? task.taskId.split("-").pop() : "#"}
                    </span>
                  </td>

                  <td className={`${TD} font-medium text-[#10284A]`}>{task.title}</td>

                  <td className={`${TD} text-gray-600`}>
                    <p className="line-clamp-3 whitespace-pre-wrap text-center leading-snug">
                      {task.description?.trim() ? task.description : "—"}
                    </p>
                  </td>

                  <td className={`${TD} text-gray-600`}>
                    <span className="flex flex-wrap items-center justify-center gap-x-1.5">
                      <CalendarDays size={14} className="shrink-0 text-gray-400" />
                      {dateLabel(task.dueDate)}
                    </span>
                  </td>

                  <td className={TD}>
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                        priorityStyles[task.priority] ?? priorityStyles.Medium
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>

                  <td className={TD}>
                    <select
                      value={task.status}
                      disabled={updatingId === task._id}
                      onChange={(event) => handleStatusChange(task._id, event.target.value as Status)}
                      className={`max-w-full rounded-full px-2.5 py-1.5 text-xs font-semibold outline-none ${statusStyles[task.status]}`}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option} className="bg-white text-gray-800">
                          {option}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className={TD}>
                    {task.attachments && task.attachments.length > 0 ? (
                      <div className="flex flex-col items-center gap-1">
                        {task.attachments.map(normalizeAttachment).map((file, i, arr) => {
                          const label = arr.length > 1 ? `View ${i + 1}` : "View";
                          const cls = "inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap";
                          return file.url ? (
                            <a
                              key={`${file.name}-${i}`}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={file.name}
                              className={`${cls} text-[#1D6FEA] hover:text-[#1556C0] hover:underline`}
                            >
                              <Paperclip size={12} className="shrink-0" />
                              {label}
                            </a>
                          ) : (
                            <a
                              key={`${file.name}-${i}`}
                              href="#"
                              title={file.name}
                              onClick={(e) => handleAttachmentClick(e, task._id, i)}
                              className={`${cls} cursor-pointer text-[#1D6FEA] hover:text-[#1556C0] hover:underline`}
                            >
                              <Paperclip size={12} className="shrink-0" />
                              {label}
                            </a>
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
    </section>
  );
};

export default TaskDetails;