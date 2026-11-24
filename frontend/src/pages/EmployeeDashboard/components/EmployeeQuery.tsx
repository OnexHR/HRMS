import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, MessageSquareText, Paperclip, SearchCheck, Send, UploadCloud, X } from "lucide-react";
import employeeApi from "../../../lib/employeeApi";
import { DEMO_EMPLOYEE_TASKS, formatWorkId } from "../../../lib/employeeTaskDemo";
import {
  notifyEmployeeQueriesChanged,
  saveDemoEmployeeQuery,
  type DemoEmployeeQueryAttachment,
} from "../../../lib/employeeQueryDemo";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import StyledSelect from "./StyledSelect";

const MAX_CHARS = 500;
const MAX_LOCAL_ATTACHMENT_BYTES = 1024 * 1024;

type Task = {
  _id: string;
  taskId?: string;
  title: string;
  status?: string;
};

const statusStyles: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-700",
  "On Hold": "bg-violet-100 text-violet-700",
  Pending: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
};

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read the selected attachment."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected attachment."));
    reader.readAsDataURL(file);
  });
}

const EmployeeQuery: React.FC = () => {
  const { employee } = useEmployeeAuth();
  const employeeId = employee?._id ?? employee?.employeeCode ?? "anonymous";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [demoTasks, setDemoTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachment, setAttachment] = useState<DemoEmployeeQueryAttachment | null>(null);
  const [attachmentIsLocal, setAttachmentIsLocal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Only the tasks the manager assigned to this employee are queryable.
  const loadTasks = useCallback(async () => {
    try {
      const res = await employeeApi.get<{ tasks: Task[] }>("/tasks");
      const loadedTasks = res.data?.tasks ?? [];
      const hasTasks = loadedTasks.length > 0;
      setTasks(hasTasks ? loadedTasks : DEMO_EMPLOYEE_TASKS);
      setDemoTasks(!hasTasks);
    } catch (loadError) {
      console.error("Could not load tasks for the query form; showing sample tasks.", loadError);
      setTasks(DEMO_EMPLOYEE_TASKS);
      setDemoTasks(true);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const selected = useMemo(
    () => tasks.find((task) => task._id === selectedTask) ?? null,
    [tasks, selectedTask],
  );

  const handleAttachmentFile = async (file?: File) => {
    if (!file) return;

    setError(null);
    setSuccess(null);
    setAttachment(null);
    setAttachmentIsLocal(false);
    setUploadingAttachment(true);

    try {
      const { data } = await employeeApi.post<{ uploadUrl?: string; key?: string }>("/upload/get-upload-url", {
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        folderMain: "queries",
        folderSub: "attachments",
      });
      if (!data?.uploadUrl || !data.key) throw new Error("The upload service returned an invalid response.");

      const response = await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!response.ok) throw new Error(`Could not upload ${file.name}.`);

      setAttachment({ name: file.name, key: data.key });
      setAttachmentIsLocal(false);
    } catch (uploadError) {
      console.error("Could not upload query attachment.", uploadError);
      if (file.size > MAX_LOCAL_ATTACHMENT_BYTES) {
        setError("Upload is unavailable. Choose a file no larger than 1 MB to attach it locally.");
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        setAttachment({ name: file.name, dataUrl });
        setAttachmentIsLocal(true);
      } catch (readError) {
        setError(readError instanceof Error ? readError.message : "Could not attach the selected file.");
      }
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    void handleAttachmentFile(file);
  };

  const handleAttachmentDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleAttachmentFile(event.dataTransfer.files[0]);
  };

  const handleRaiseQuery = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedTask) {
      setError("Select the work item your query is about.");
      return;
    }
    if (!message.trim()) {
      setError("Describe your query, problem or remarks.");
      return;
    }
    if (!selected) {
      setError("Select a valid work item for your query.");
      return;
    }

    const saveLocally = (notice: string) => {
      try {
        saveDemoEmployeeQuery({
          message: message.trim(),
          task: { title: selected.title, taskId: formatWorkId(selected.taskId) ?? undefined },
          attachment,
        }, employeeId);
        setMessage("");
        setSelectedTask("");
        setAttachment(null);
        setAttachmentIsLocal(false);
        setSuccess(notice);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save your query on this device.");
      }
    };

    if (demoTasks || attachment?.dataUrl) {
      saveLocally(attachment ? "Query and attachment saved on this device." : "Query saved on this device.");
      return;
    }

    setSubmitting(true);

    try {
      await employeeApi.post("/queries", {
        task: selectedTask,
        message: message.trim(),
        attachments: attachment?.key ? [attachment.key] : [],
      });
      notifyEmployeeQueriesChanged();
      setMessage("");
      setSelectedTask("");
      setAttachment(null);
      setAttachmentIsLocal(false);
      setSuccess("Query raised successfully. Your manager has been notified.");
    } catch (submitError) {
      console.error("Could not submit query to the API; saving it on this device.", submitError);
      saveLocally(
        attachment
          ? "Query and attachment saved on this device."
          : "Query service unavailable. Your query was saved on this device.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`${CARD} p-4`}>
      <div className="flex items-center gap-3">
        <MessageSquareText size={24} className="text-[#1D4ED8]" />
        <h3 className="text-[22px] font-extrabold text-[#14226B]">Employee Query</h3>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Work picker */}
        <div className="flex flex-col rounded-2xl border border-blue-200 bg-white/70 p-4">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[#14226B]">
            <BarChart3 size={18} className="text-[#1D4ED8]" />
            Work
          </div>

          <p className="mt-3 text-sm font-medium text-[#14226B]">Select work:</p>

          <div className="relative mt-1.5">
            <StyledSelect
              value={selectedTask}
              onChange={setSelectedTask}
              options={[
                { value: "", label: tasksLoading ? "Loading work..." : "Select work" },
                ...tasks.map((task) => ({
                  value: task._id,
                  label: `${formatWorkId(task.taskId) ? `${formatWorkId(task.taskId)} - ` : ""}${task.title}`,
                })),
              ]}
              ariaLabel="Select work for your query"
              leadingIcon={<BarChart3 size={17} />}
              triggerClassName="py-2.5 !border-blue-200"
            />
          </div>

          {demoTasks && (
            <p className="mt-2 text-xs text-amber-700">
              Sample work is shown. Queries will be saved on this device while work data is unavailable.
            </p>
          )}

          {!tasksLoading && tasks.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">
              No work assigned to you yet. You can raise a query once your manager assigns work.
            </p>
          )}

          {selected ? (
            <p className="mt-3 text-xs text-gray-500">
              Status:{" "}
              <span
                className={`rounded-full px-2.5 py-0.5 font-semibold ${
                  statusStyles[selected.status ?? ""] ?? statusStyles.Pending
                }`}
              >
                {selected.status ?? "Pending"}
              </span>
            </p>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center pt-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E4ECFF]">
                <SearchCheck size={24} className="text-[#3B82F6]" />
              </div>
              <p className="mt-3 text-sm font-medium text-[#14226B]">
                Select work to raise a query about it.
              </p>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="flex flex-col rounded-2xl border border-blue-200 bg-white/70 p-4">
          <div className="flex items-center gap-2 text-[15px] font-bold text-[#14226B]">
            <MessageSquareText size={18} className="text-[#1D4ED8]" />
            Employee query / problem / remarks
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Write your query, problem or remarks here..."
            rows={4}
            className="mt-3 w-full resize-none rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm text-[#14226B] shadow-sm outline-none placeholder:text-gray-400 focus:border-[#1D5BFF]"
          />

          <p className="mt-1 text-right text-xs text-gray-400">
            {message.length}/{MAX_CHARS}
          </p>

          <div>
            <div className="flex items-center gap-2">
              <Paperclip size={17} className="text-[#1D4ED8]" />
              <span className="text-sm font-semibold text-[#14226B]">
                Attachment <span className="font-normal text-gray-500">(Optional)</span>
              </span>
            </div>

            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleAttachmentDrop}
              className={`mt-1.5 flex h-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition ${
                dragging ? "border-[#1D5BFF] bg-blue-50" : "border-blue-300 bg-[#F5F8FF] hover:bg-blue-50"
              } ${uploadingAttachment ? "pointer-events-none opacity-60" : ""}`}
            >
              <UploadCloud size={22} strokeWidth={1.7} className="text-[#14226B]" />
              <p className="mt-1 max-w-full truncate text-sm font-medium text-[#14226B]">
                {uploadingAttachment
                  ? "Uploading..."
                  : attachment?.name ?? "Drop or click to upload"}
              </p>
              <p className="mt-0.5 text-[11px] text-gray-500">
                PDF, DOC, DOCX, JPG, PNG · Local fallback up to 1 MB
                {attachmentIsLocal ? " · Saved locally" : ""}
              </p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                disabled={uploadingAttachment}
                onChange={handleAttachmentChange}
              />
            </label>
            {attachment && (
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => {
                    setAttachment(null);
                    setAttachmentIsLocal(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 transition hover:text-rose-600"
                >
                  <X size={13} />
                  Remove file
                </button>
              </div>
            )}
          </div>

          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleRaiseQuery}
              disabled={submitting || uploadingAttachment}
              className="employee-primary-action flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold transition"
            >
              <Send size={16} />
              {submitting ? "Raising..." : "Raise Query"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmployeeQuery;