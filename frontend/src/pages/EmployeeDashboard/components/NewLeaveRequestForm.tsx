import React, { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  FilePlus2,
  Paperclip,
  Phone,
  RotateCcw,
  Save,
  Send,
  Sun,
  UploadCloud,
  UserRound,
} from "lucide-react";
import employeeApi from "../../../lib/employeeApi";
import {
  EMPLOYEE_LEAVE_DRAFT_EDIT_EVENT,
  getEmployeeLeaveRequests,
  saveEmployeeLeaveRequest,
} from "../../../lib/employeeLeaveStore";
import StyledSelect from "./StyledSelect";
import LeaveDatePicker from "./LeaveDatePicker";

const leaveTypes = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "earned", label: "Earned Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];
const dayTypes = [
  { value: "full_day", label: "Full Day" },
  { value: "first_half", label: "First Half" },
  { value: "second_half", label: "Second Half" },
];

const DEFAULT_FROM = "2026-09-22";
const DEFAULT_TO = "2026-09-23";
const MAX_REASON = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const inputBase =
  "w-full rounded-xl border border-blue-100 bg-white py-3 pl-11 pr-4 text-sm font-medium text-[#14226B] outline-none placeholder:font-normal placeholder:text-gray-400 focus:border-[#1D5BFF] focus:ring-4 focus:ring-blue-100";
const iconCls = "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#14226B]";

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const NewLeaveRequestForm: React.FC = () => {
  const [leaveType, setLeaveType] = useState("casual");
  const [reportingManager, setReportingManager] = useState("Reporting Manager");
  const [fromDate, setFromDate] = useState(DEFAULT_FROM);
  const [toDate, setToDate] = useState(DEFAULT_TO);
  const [dayType, setDayType] = useState("full_day");
  const [contact, setContact] = useState("");
  const [reason, setReason] = useState("");
  const [fileName, setFileName] = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successText, setSuccessText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    employeeApi
      .get("/me")
      .then((res) => {
        const employee = res.data?.employee;
        const manager = employee?.manager;
        if (manager && typeof manager === "object") {
          setReportingManager(`${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() || "Reporting Manager");
        }
      })
      .catch(() => {
        setReportingManager("Reporting Manager");
      });
  }, []);

  useEffect(() => {
    const handleEditDraft = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id;
      if (!id) return;

      try {
        const draft = getEmployeeLeaveRequests().find(
          (request) => request.id === id && request.status === "draft",
        );
        if (!draft) {
          setSubmitError("This draft is no longer available. Refresh the draft list and try again.");
          return;
        }

        setLeaveType(draft.leaveType);
        setFromDate(draft.fromDate);
        setToDate(draft.toDate);
        setDayType(draft.dayType);
        setContact(draft.contactWhileOnLeave);
        setReason(draft.reason);
        setFileName(draft.attachments[0] ?? "");
        setEditingDraftId(draft.id);
        setSubmitError(null);
        setSuccessText(null);
        document.getElementById("new-leave-request")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Could not open this draft.");
      }
    };

    window.addEventListener(EMPLOYEE_LEAVE_DRAFT_EDIT_EVENT, handleEditDraft);
    return () => window.removeEventListener(EMPLOYEE_LEAVE_DRAFT_EDIT_EVENT, handleEditDraft);
  }, []);

  const durationDays =
    fromDate && toDate
      ? Math.max(
          1,
          Math.round(
            (new Date(toDate).getTime() - new Date(fromDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : 0;

  const formatShort = (dateStr: string) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
        })
      : "";

  const pickFile = (file?: File | null) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setSubmitError("Attachment is larger than 5 MB.");
      return;
    }
    setSubmitError(null);
    setFileName(file.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const handleReset = () => {
    setLeaveType("casual");
    setFromDate(DEFAULT_FROM);
    setToDate(DEFAULT_TO);
    setDayType("full_day");
    setContact("");
    setReason("");
    setFileName("");
    setEditingDraftId(null);
    setSubmitError(null);
    setSuccessText(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submitLeave = async (mode: "submit" | "draft") => {
    if (!fromDate || !toDate || !reason.trim()) {
      setSubmitError("From date, to date, and reason are required.");
      setSuccessText(null);
      return;
    }

    setSaving(true);
    setSubmitError(null);
    setSuccessText(null);

    try {
      const payload = {
        leaveType,
        fromDate,
        toDate,
        dayType,
        reason,
        contactWhileOnLeave: contact,
        attachments: fileName ? [fileName] : [],
      };

      saveEmployeeLeaveRequest(
        payload,
        mode === "submit" ? "pending" : "draft",
        editingDraftId ?? undefined,
      );
      setSuccessText(
        mode === "submit"
          ? "Leave request submitted successfully."
          : editingDraftId
            ? "Draft request updated successfully."
            : "Leave draft saved successfully.",
      );
      if (mode === "submit") setEditingDraftId(null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save leave request.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => submitLeave("submit");
  const handleSaveDraft = () => submitLeave("draft");

  const labelCls = "text-[14px] font-bold text-[#14226B]";

  return (
    <section id="new-leave-request" className={`${CARD} scroll-mt-6 p-6`}>
      <div className="flex items-center gap-3">
        <FilePlus2 size={28} className="text-[#1D4ED8]" />
        <div>
          <h3 className="text-[22px] font-extrabold leading-tight text-[#14226B]">
            {editingDraftId ? "Edit Draft Request" : "New Leave Request"}
          </h3>
          <p className="text-[13px] text-gray-500">
            {editingDraftId ? "Update your saved leave request" : "Fill in the details below to apply for a leave"}
          </p>
        </div>
      </div>

      {submitError && <p className="mt-3 text-sm text-rose-600">{submitError}</p>}
      {successText && <p className="mt-3 text-sm text-emerald-600">{successText}</p>}

      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
        {/* Leave type */}
        <div>
          <label className={labelCls}>
            Leave Type <span className="text-rose-500">*</span>
          </label>
          <div className="mt-1.5">
            <StyledSelect
              value={leaveType}
              onChange={setLeaveType}
              options={leaveTypes}
              leadingIcon={<CalendarDays size={18} />}
              ariaLabel="Leave Type"
            />
          </div>
        </div>

        {/* Reporting manager */}
        <div>
          <label className={labelCls}>
            Reporting Manager <span className="text-rose-500">*</span>
          </label>
          <div className="relative mt-1.5">
            <UserRound size={18} className={iconCls} />
            <input value={reportingManager} readOnly className={`${inputBase} bg-[#EDF1F8] text-gray-600`} />
          </div>
        </div>

        {/* Day type */}
        <div>
          <label className={labelCls}>Day Type</label>
          <div className="mt-1.5">
            <StyledSelect
              value={dayType}
              onChange={setDayType}
              options={dayTypes}
              leadingIcon={<Sun size={18} />}
              ariaLabel="Day Type"
            />
          </div>
        </div>

        <div className="hidden md:block" />

        {/* Dates */}
        <div>
          <label className={labelCls}>
            From Date <span className="text-rose-500">*</span>
          </label>
          <div className="mt-1.5">
            <LeaveDatePicker value={fromDate} onChange={setFromDate} label="From Date" />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            To Date <span className="text-rose-500">*</span>
          </label>
          <div className="mt-1.5">
            <LeaveDatePicker value={toDate} onChange={setToDate} label="To Date" />
          </div>
        </div>

        {durationDays > 0 && fromDate && toDate && (
          <p className="text-sm font-semibold text-[#1D4ED8] md:col-span-2 md:-mt-2">
            Duration: {durationDays} day{durationDays > 1 ? "s" : ""} ({formatShort(fromDate)} – {formatShort(toDate)})
          </p>
        )}

        {/* Contact */}
        <div className="md:col-span-2">
          <label className={labelCls}>Contact While on Leave</label>
          <div className="relative mt-1.5">
            <Phone size={18} className={iconCls} />
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone or alternate contact"
              className={inputBase}
            />
          </div>
        </div>

        {/* Reason */}
        <div className="grid gap-5 md:col-span-2 md:grid-cols-[minmax(0,1.35fr)_minmax(260px,1fr)]">
          <label className={labelCls}>
            <span>
              Reason <span className="text-rose-500">*</span>
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_REASON))}
              placeholder="Enter reason for leave..."
              rows={4}
              className="mt-1.5 block h-32 w-full resize-none rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-[#14226B] outline-none placeholder:font-normal placeholder:text-gray-400 focus:border-[#1D5BFF] focus:ring-4 focus:ring-blue-100"
            />
            <span className="mt-1 block text-right text-xs font-normal text-gray-500">
              {reason.length} / {MAX_REASON}
            </span>
          </label>

          <div>
            <div className="flex items-center gap-2">
              <Paperclip size={18} className="text-[#1D4ED8]" />
              <span className={labelCls}>
                Attachments <span className="font-normal text-gray-500">(Optional)</span>
              </span>
            </div>

            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`mt-1.5 flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition ${
                dragging ? "border-[#1D5BFF] bg-blue-50" : "border-blue-200 bg-[#F5F8FF] hover:bg-blue-50"
              }`}
            >
              <UploadCloud size={28} strokeWidth={1.7} className="text-[#14226B]" />
              <p className="mt-2 max-w-full truncate text-sm font-medium text-[#14226B]">
                {fileName || "Drop or click to upload"}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">PDF, DOC, DOCX, JPG, PNG · Max 5MB</p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={handleReset}
          className="flex items-center gap-2 rounded-xl border border-[#1D5BFF] bg-white px-6 py-3 text-sm font-semibold text-[#1D4ED8] transition hover:bg-blue-50 disabled:opacity-60"
        >
          <RotateCcw size={17} />
          Reset Form
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDraft}
            className="flex items-center gap-2 rounded-xl border border-[#1D5BFF] bg-white px-6 py-3 text-sm font-semibold text-[#1D4ED8] transition hover:bg-blue-50 disabled:opacity-60"
          >
            <Save size={17} />
            {editingDraftId ? "Update Draft" : "Save as Draft"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="employee-primary-action flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-semibold transition"
          >
            <Send size={17} />
            {saving ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </section>
  );
};

export default NewLeaveRequestForm;