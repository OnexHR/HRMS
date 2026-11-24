import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  Hash,
  Info,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  Trash2,
  User,
  UserRound,
  UsersRound,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Footer2 from "../../../components/Footer2";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import employeeApi from "../../../lib/employeeApi";
import { getInitials } from "../../../utils/getInitials";
import { getProfileImageUrl } from "../../../utils/getImageUrl";
import type { EmployeeUser } from "../../../types/Employee";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MAX_SIZE_MB = 2;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PROFILE_CACHE_KEY = "hrms_employee_profile_v1";
const EMPLOYEE_ATTENDANCE_KEY = "employee_attendance_status";
const EMPLOYEE_ATTENDANCE_EVENT = "employee-attendance-status-change";

type EmployeeFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  employeeCode: string;
  reportingManager: string;
  role: string;
  joinDate: string;
  status: string;
  bio: string;
  imageUrl: string;
};

const EMPTY: EmployeeFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  employeeCode: "",
  reportingManager: "",
  role: "",
  joinDate: "",
  status: "",
  bio: "",
  imageUrl: "",
};

const dateLabel = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const toFormData = (employee: EmployeeUser | null): EmployeeFormData => {
  if (!employee) return EMPTY;
  const managerName =
    employee.manager && typeof employee.manager === "object"
      ? `${employee.manager.firstName ?? ""} ${employee.manager.lastName ?? ""}`.trim()
      : "";

  return {
    firstName: employee.firstName ?? "",
    lastName: employee.lastName ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    department: employee.department ?? "",
    designation: employee.designation ?? "",
    employeeCode: employee.employeeCode ?? "",
    reportingManager: managerName,
    role: employee.role ?? "",
    joinDate: dateLabel(employee.job?.joinDate),
    status: employee.job?.status ?? "",
    bio: employee.profile?.bio ?? "",
    imageUrl: employee.profile?.imageUrl ?? "",
  };
};

function getSessionProfileFallback(employee: EmployeeUser | null): EmployeeFormData {
  const fallback = toFormData(employee);
  try {
    const rawUser = sessionStorage.getItem("hrms.demo.user");
    if (!rawUser) return fallback;

    const user: unknown = JSON.parse(rawUser);
    if (typeof user !== "object" || user === null || Array.isArray(user)) return fallback;
    const sessionUser = user as Record<string, unknown>;
    const identifier = typeof sessionUser.id === "string" ? sessionUser.id : "";
    const nameParts = identifier
      .split("@")[0]
      .split(/[.\s_-]+/)
      .filter(Boolean);
    const titleCase = (part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    const role = typeof sessionUser.role === "string" ? sessionUser.role : "";

    return {
      ...fallback,
      firstName: fallback.firstName || (nameParts.length > 1 ? titleCase(nameParts[0]) : ""),
      lastName: fallback.lastName || (nameParts.length > 1 ? nameParts.slice(1).map(titleCase).join(" ") : ""),
      email: fallback.email || (identifier.includes("@") ? identifier : ""),
      role: fallback.role || role,
    };
  } catch (error) {
    console.error("Could not read the signed-in employee identity.", error);
    return fallback;
  }
}

function isEmployeeFormData(value: unknown): value is EmployeeFormData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.firstName === "string" &&
    typeof record.lastName === "string" &&
    typeof record.email === "string" &&
    typeof record.phone === "string" &&
    typeof record.department === "string" &&
    typeof record.designation === "string" &&
    typeof record.employeeCode === "string" &&
    typeof record.reportingManager === "string" &&
    typeof record.role === "string" &&
    typeof record.joinDate === "string" &&
    typeof record.status === "string" &&
    typeof record.bio === "string" &&
    typeof record.imageUrl === "string"
  );
}

function storedProfileOr(employee: EmployeeUser | null): EmployeeFormData {
  const fallback = getSessionProfileFallback(employee);
  const cached = localStorage.getItem(PROFILE_CACHE_KEY);
  if (!cached) return fallback;

  try {
    const parsed: unknown = JSON.parse(cached);
    if (isEmployeeFormData(parsed)) return parsed;
  } catch (error) {
    console.error("Could not read the cached employee profile.", error);
  }
  return fallback;
}

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const ROW_BOX =
  "flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-blue-100 bg-[#F1F5FD] px-4 py-3";

// Square action button next to a field: pencil when editable, lock when it is not.
const FieldAction: React.FC<{ editable?: boolean; active?: boolean; onClick?: () => void; label: string }> = ({
  editable,
  active,
  onClick,
  label,
}) =>
  editable ? (
    <button
      type="button"
      aria-label={`Edit ${label}`}
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
        active
          ? "employee-primary-action"
          : "bg-[#E1EAFF] text-[#1D4ED8] hover:bg-[#D3E0FF]"
      }`}
    >
      <Pencil size={17} />
    </button>
  ) : (
    <span
      title={`${label} is maintained by HR`}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF1F7] text-gray-400"
    >
      <Lock size={15} />
    </span>
  );

const FieldLabel: React.FC<{ children: React.ReactNode; note?: string }> = ({ children, note }) => (
  <label className="flex items-center gap-2 text-[14px] font-bold text-[#14226B]">
    {children}
    {note && (
      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
        <Lock size={9} /> {note}
      </span>
    )}
  </label>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-3 border-b border-blue-100 pb-3">
    <span className="text-[#1D4ED8]">{icon}</span>
    <h3 className="text-[20px] font-extrabold text-[#14226B]">{title}</h3>
  </div>
);

const EmployeeProfile: React.FC = () => {
  const { employee: authenticatedEmployee, refreshEmployee } = useEmployeeAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY);
  const [initialFormData, setInitialFormData] = useState<EmployeeFormData>(EMPTY);
  const [previewLink, setPreviewLink] = useState("");
  const [localPreview, setLocalPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState<"upload" | "remove" | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [presence, setPresence] = useState<"online" | "offline">(() =>
    localStorage.getItem(EMPLOYEE_ATTENDANCE_KEY) === "online" ? "online" : "offline",
  );
  // Only phone and bio can be edited here; the pencil unlocks the field.
  const [editingPhone, setEditingPhone] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const bioRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let active = true;
    employeeApi
      .get<{ employee: EmployeeUser }>("/me")
      .then(async (res) => {
        const next = res.data?.employee
          ? toFormData(res.data.employee)
          : storedProfileOr(authenticatedEmployee);
        if (!active) return;
        setError("");
        setFormData(next);
        setInitialFormData(next);
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(next));
        setLocalPreview("");
        const image = next.imageUrl ? await getProfileImageUrl(next.imageUrl) : "";
        if (active) setPreviewLink(image);
      })
      .catch(async (loadError) => {
        console.error("Could not load the employee profile from the server.", loadError);
        const next = storedProfileOr(authenticatedEmployee);
        if (!active) return;
        setFormData(next);
        setInitialFormData(next);
        const image = next.imageUrl ? await getProfileImageUrl(next.imageUrl) : "";
        if (active) setPreviewLink(image);
      })
      .catch((fallbackError) => {
        console.error("Could not initialize the employee profile fallback.", fallbackError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authenticatedEmployee]);

  useEffect(() => {
    if (editingPhone) phoneRef.current?.focus();
  }, [editingPhone]);

  useEffect(() => {
    if (editingBio) bioRef.current?.focus();
  }, [editingBio]);

  useEffect(() => {
    const updatePresence = () => {
      setPresence(localStorage.getItem(EMPLOYEE_ATTENDANCE_KEY) === "online" ? "online" : "offline");
    };
    window.addEventListener(EMPLOYEE_ATTENDANCE_EVENT, updatePresence);
    return () => window.removeEventListener(EMPLOYEE_ATTENDANCE_EVENT, updatePresence);
  }, []);

  const isFormChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  const avatar = localPreview || previewLink;

  const handleChange = (field: keyof EmployeeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const uploadImage = async (file: File) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/upload/get-upload-url`, {
      fileName: file.name,
      fileType: file.type,
      folderMain: "employees",
    });

    const response = await fetch(data.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    if (!response.ok) throw new Error("Image upload failed");

    return data.key as string;
  };

  // The picture is persisted on its own rather than waiting for Save Changes, so
  // picking an image immediately updates the backend and the header. The previous
  // object is deleted from R2 too, otherwise every replacement leaks a file.
  const persistPicture = async (nextKey: string) => {
    const previousKey = formData.imageUrl;
    const res = await employeeApi.put<{ employee: EmployeeUser }>("/me", { imageUrl: nextKey });

    const next = toFormData(res.data?.employee ?? null);
    setFormData(next);
    setInitialFormData(next);
    setLocalPreview("");
    setPreviewLink(next.imageUrl ? await getProfileImageUrl(next.imageUrl) : "");

    await refreshEmployee().catch(() => null);

    if (previousKey && previousKey !== nextKey) {
      axios
        .delete(`${API_BASE_URL}/api/upload/delete-file`, { data: { fileKey: previousKey } })
        .catch(() => null);
    }
  };

  const handlePictureSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPG, PNG or WebP files are allowed.");
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Max file size is ${MAX_SIZE_MB}MB.`);
      return;
    }

    try {
      setError("");
      setSuccess("");
      setImageLoading("upload");

      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);

      const finalKey = await uploadImage(file);

      try {
        await persistPicture(finalKey);
        setSuccess("Profile picture updated successfully!");
      } catch (err) {
        // The object reached R2 but the profile write failed, so roll the local
        // state back rather than showing a picture the backend does not have.
        URL.revokeObjectURL(preview);
        setLocalPreview("");
        setError(err instanceof Error ? err.message : "Could not save your profile picture.");
      }
    } catch (err) {
      console.error("Upload failed", err);
      setError("Failed to upload image.");
    } finally {
      setImageLoading(null);
    }
  };

  const handleRemovePicture = async () => {
    const previousKey = formData.imageUrl;
    if (!previousKey) return;

    try {
      setError("");
      setSuccess("");
      setImageLoading("remove");
      await persistPicture("");
      setSuccess("Profile picture removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove your profile picture.");
    } finally {
      setImageLoading(null);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setLocalPreview("");
    setPreviewLink(initialFormData.imageUrl ? previewLink : "");
    setError("");
    setSuccess("");
    setEditingPhone(false);
    setEditingBio(false);
  };

  const handleSave = async () => {
    const saveLocally = () => {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(formData));
      setInitialFormData(formData);
      setEditingPhone(false);
      setEditingBio(false);
      setSuccess("Profile saved on this device.");
    };

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Only the fields PUT /me accepts; name, email and employee code are
      // server-managed, and department/designation are admin-only.
      const res = await employeeApi.put<{ employee: EmployeeUser }>("/me", {
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
        imageUrl: formData.imageUrl,
      });

      const next = res.data?.employee ? toFormData(res.data.employee) : formData;
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(next));
      setFormData(next);
      setInitialFormData(next);
      setLocalPreview("");
      setPreviewLink(next.imageUrl ? await getProfileImageUrl(next.imageUrl) : "");

      // Keep the header in sync without a full reload.
      await refreshEmployee().catch(() => null);

      setEditingPhone(false);
      setEditingBio(false);
      setSuccess("Profile updated successfully!");
    } catch {
      try {
        saveLocally();
      } catch (storageError) {
        setError(storageError instanceof Error ? storageError.message : "Could not save your profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  const fullName =
    `${formData.firstName} ${formData.lastName}`.trim() ||
    `${authenticatedEmployee?.firstName ?? ""} ${authenticatedEmployee?.lastName ?? ""}`.trim() ||
    authenticatedEmployee?.email?.split("@")[0] ||
    "My Profile";
  const roleLabel = formData.role
    ? formData.role.charAt(0).toUpperCase() + formData.role.slice(1)
    : "Employee";
  const statusLabel = formData.status ? formData.status.charAt(0).toUpperCase() + formData.status.slice(1) : "";

  // Read-only field with an icon and a lock action.
  const readField = (label: string, value: string, icon: React.ReactNode, placeholder = "-", note?: string) => (
    <div>
      <FieldLabel note={note}>{label}</FieldLabel>
      <div className="mt-1.5 flex items-center gap-3">
        <div className={ROW_BOX}>
          <span className="shrink-0 text-[#14226B]">{icon}</span>
          <span className={`min-w-0 truncate text-sm font-medium ${value ? "text-[#14226B]" : "text-gray-400"}`}>
            {value || placeholder}
          </span>
        </div>
        <FieldAction label={label} />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#E6EDFF] via-[#EFF3FF] to-[#E3EAFF] text-gray-800">
      <Sidebar active="profile" />

      <main className="ml-60 flex flex-1 flex-col">
        <Header hideBanner />

        <div className="flex-1 space-y-6 p-6 pt-4">
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className={`${CARD} flex items-center gap-2 px-5 py-6 text-sm text-gray-500`}>
              <Loader2 size={16} className="animate-spin" />
              Loading your profile...
            </div>
          ) : (
            <>
              {/* Profile banner */}
              <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B2A6B] via-[#10358A] to-[#1B3FAF] p-6 text-white shadow-[0_12px_36px_rgba(15,42,122,0.3)]">
                <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -bottom-32 right-24 h-72 w-72 rounded-full bg-white/5" />

                <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-[132px] w-[132px] items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-[#10284A] text-3xl font-bold text-white shadow-xl">
                      {avatar ? (
                        <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        getInitials(fullName)
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label="Change profile picture"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageLoading !== null}
                      className="employee-primary-action absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-white transition disabled:opacity-50"
                    >
                      {imageLoading === "upload" ? <Loader2 size={17} className="animate-spin" /> : <Camera size={17} />}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      onChange={handlePictureSelected}
                      className="hidden"
                    />
                  </div>

                  {/* Identity */}
                  <div className="min-w-0 flex-1 text-center sm:pr-36 sm:text-left">
                    <h3 className="flex flex-wrap items-center justify-center gap-2 text-[30px] font-extrabold leading-tight sm:justify-start">
                      {fullName || "Employee"}
                      <BadgeCheck size={24} className="shrink-0 fill-[#1D5BFF] text-white" />
                    </h3>

                    <p className="mt-1 text-[16px] text-blue-100">
                      {formData.designation || <span className="capitalize">{formData.role}</span>}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                      <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
                        <Briefcase size={14} className="text-blue-200" />
                        {roleLabel}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
                        <Hash size={14} className="text-blue-200" />
                        Emp ID: {formData.employeeCode || "—"}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                      <button
                        type="button"
                        onClick={handleRemovePicture}
                        disabled={imageLoading !== null || !formData.imageUrl}
                        className="flex items-center gap-2 rounded-lg border border-white/40 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10  disabled:opacity-40"
                      >
                        {imageLoading === "remove" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Remove Picture
                      </button>
                      <span className="text-xs text-blue-200">JPG, PNG or WebP · Max {MAX_SIZE_MB}MB</span>
                    </div>
                  </div>

                  <div
                    aria-label={presence === "online" ? "Online" : "Offline"}
                    className={`absolute right-0 top-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
                      presence === "online"
                        ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                        : "border-white/20 bg-white/10 text-blue-100"
                    }`}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        presence === "online" ? "bg-emerald-300" : "bg-slate-300"
                      }`}
                    />
                    {presence === "online" ? "Online" : "Offline"}
                  </div>
                </div>
              </section>

              {/* Personal Information */}
              <section className={`${CARD} p-6`}>
                <SectionTitle icon={<User size={24} />} title="Personal Information" />

                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                  {readField("Full Name", fullName, <User size={18} />, "-", undefined)}
                  {readField("Employee ID", formData.employeeCode, <Hash size={18} />, "e.g. EMP001")}
                  {readField("Department", formData.department, <Briefcase size={18} />, "Set by admin", "Admin only")}
                  {readField("Designation", formData.designation, <UserRound size={18} />, "Set by admin", "Admin only")}
                </div>

                <p className="mt-4 text-xs text-gray-400">
                  Name, email and employee ID are maintained by the HR admin and cannot be edited here.
                </p>
              </section>

              {/* Contact Information */}
              <section className={`${CARD} p-6`}>
                <SectionTitle icon={<Phone size={24} />} title="Contact Information" />

                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                  {readField("Email Address", formData.email, <Mail size={18} />)}

                  <div>
                    <FieldLabel>Phone Number</FieldLabel>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className={`${ROW_BOX} ${editingPhone ? "border-[#1D5BFF] bg-white" : ""}`}>
                        <Phone size={18} className="shrink-0 text-[#14226B]" />
                        <input
                          ref={phoneRef}
                          type="tel"
                          value={formData.phone}
                          readOnly={!editingPhone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          placeholder="Enter phone number"
                          className="w-full min-w-0 bg-transparent text-sm font-medium text-[#14226B] outline-none placeholder:font-normal placeholder:text-gray-400"
                        />
                      </div>
                      <FieldAction editable active={editingPhone} onClick={() => setEditingPhone((v) => !v)} label="Phone Number" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Employment Details */}
              <section className={`${CARD} p-6`}>
                <SectionTitle icon={<Briefcase size={24} />} title="Employment Details" />

                <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
                  {readField("Reporting Manager", formData.reportingManager, <UserRound size={18} />, "Not assigned")}
                  {readField("Role", formData.role ? formData.role.charAt(0).toUpperCase() + formData.role.slice(1) : "", <UsersRound size={18} />)}
                  {readField("Join Date", formData.joinDate, <CalendarDays size={18} />)}
                  {readField("Status", statusLabel, <Building2 size={18} />)}
                </div>
              </section>

              {/* About Me (bio) */}
              <section className={`${CARD} p-6`}>
                <SectionTitle icon={<Info size={24} />} title="About Me" />

                <div
                  className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    editingBio ? "border-[#1D5BFF] bg-white" : "border-blue-100 bg-[#F1F5FD]"
                  }`}
                >
                  <textarea
                    ref={bioRef}
                    value={formData.bio}
                    readOnly={!editingBio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    placeholder="Write a short bio..."
                    rows={3}
                    className="w-full flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-[#14226B] outline-none placeholder:text-gray-400"
                  />
                  <FieldAction editable active={editingBio} onClick={() => setEditingBio((v) => !v)} label="Bio" />
                </div>
              </section>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !isFormChanged}
                  className="employee-primary-action w-40 rounded-xl py-3 text-sm font-semibold transition"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving || !isFormChanged}
                  className="w-40 rounded-xl border border-[#1D5BFF] bg-white py-3 text-sm font-semibold text-[#1D4ED8] transition hover:bg-blue-50  disabled:opacity-50"
                >
                  Discard
                </button>
              </div>

            </>
          )}
        </div>

        <Footer2 />
      </main>
    </div>
  );
};

export default EmployeeProfile;