import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Camera, Loader2, Trash2, User, Mail, Phone, Building2, Hash, FileText, UserRound, Lock } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "./../components/Header";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import employeeApi from "../../../lib/employeeApi";
import { getInitials } from "../../../utils/getInitials";
import { getProfileImageUrl } from "../../../utils/getImageUrl";
import type { EmployeeUser } from "../../../types/Employee";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MAX_SIZE_MB = 2;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type ManagerFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  employeeCode: string;
  joinDate: string;
  bio: string;
  imageUrl: string;
};

const EMPTY: ManagerFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  employeeCode: "",
  joinDate: "",
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

const toFormData = (employee: EmployeeUser | null): ManagerFormData => {
  if (!employee) return EMPTY;
  return {
    firstName: employee.firstName ?? "",
    lastName: employee.lastName ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    department: employee.department ?? "",
    designation: employee.designation ?? "",
    employeeCode: employee.employeeCode ?? "",
    joinDate: dateLabel(employee.job?.joinDate),
    bio: employee.profile?.bio ?? "",
    imageUrl: employee.profile?.imageUrl ?? "",
  };
};

const ManagerProfile: React.FC = () => {
  const { refreshEmployee } = useEmployeeAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [formData, setFormData] = useState<ManagerFormData>(EMPTY);
  const [initialFormData, setInitialFormData] = useState<ManagerFormData>(EMPTY);
  const [previewLink, setPreviewLink] = useState("");
  const [localPreview, setLocalPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState<"upload" | "remove" | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await employeeApi.get<{ employee: EmployeeUser }>("/me");
      const next = toFormData(res.data?.employee ?? null);
      setFormData(next);
      setInitialFormData(next);
      setLocalPreview("");
      setPreviewLink(next.imageUrl ? await getProfileImageUrl(next.imageUrl) : "");
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isFormChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  const avatar = localPreview || previewLink;

  const handleChange = (field: keyof ManagerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const uploadImage = async (file: File) => {
    const { data } = await axios.post(`${API_BASE_URL}/api/upload/get-upload-url`, {
      fileName: file.name,
      fileType: file.type,
      folderMain: "managers",
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
      } catch (err: any) {
        // The object reached R2 but the profile write failed, so roll the local
        // state back rather than showing a picture the backend does not have.
        URL.revokeObjectURL(preview);
        setLocalPreview("");
        setError(err.response?.data?.message || "Could not save your profile picture.");
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not remove your profile picture.");
    } finally {
      setImageLoading(null);
    }
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setLocalPreview("");
    setError("");
    setSuccess("");
  };

  const handleSave = async () => {
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

      const next = toFormData(res.data?.employee ?? null);
      setFormData(next);
      setInitialFormData(next);
      setLocalPreview("");
      setPreviewLink(next.imageUrl ? await getProfileImageUrl(next.imageUrl) : "");

      // Keep the header in sync without a full reload.
      await refreshEmployee().catch(() => null);

      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      console.error("Failed to update profile", err);
      setError(err.response?.data?.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar active="profile" />

      <main className="ml-60">
        <Header />

        <div className="space-y-6 p-6">
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
            <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-5 py-6 text-sm text-gray-500 shadow-sm">
              <Loader2 size={16} className="animate-spin" />
              Loading your profile...
            </div>
          ) : (
            <>
              {/* Profile Picture */}
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  <div className="flex shrink-0 flex-col items-center gap-2">
                    <div className="relative">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#2459A6] bg-[#10284A] text-lg font-bold text-white">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt="Profile"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(`${formData.firstName} ${formData.lastName}`.trim())
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageLoading !== null}
                        className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#2459A6] text-white transition hover:bg-[#1e4a8c] disabled:opacity-50"
                      >
                        {imageLoading === "upload" ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Camera size={14} />
                        )}
                      </button>
                    </div>

                    <span className="text-xs text-gray-400">JPG, PNG or WebP</span>
                    <span className="-mt-1 text-xs text-gray-400">
                      Max Size {MAX_SIZE_MB}MB
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-[#10284A]">
                      Profile Picture
                    </h2>
                    <p className="mb-3 mt-1 text-sm text-gray-500">
                      You can add, change, or remove your profile picture from here
                      anytime.
                    </p>

                    <button
                      type="button"
                      onClick={handleRemovePicture}
                      disabled={imageLoading !== null || !formData.imageUrl}
                      className="flex items-center gap-2 rounded-lg border border-rose-500 bg-white px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {imageLoading === "remove" ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Remove Picture
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      onChange={handlePictureSelected}
                      className="hidden"
                    />
                  </div>
                </div>
              </section>

              {/* Profile Information */}
              <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <User size={20} className="text-[#10284A]" />
                  <h3 className="text-lg font-semibold text-[#10284A]">
                    Profile Information
                  </h3>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-[#10284A]">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      disabled
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#10284A]">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      disabled
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#10284A]">
                      <Mail size={14} /> Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#10284A]">
                      <Phone size={14} /> Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="Enter phone number"
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#2459A6]"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#10284A]">
                      <Building2 size={14} /> Department
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        <Lock size={9} /> Admin only
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      readOnly
                      placeholder="Set by admin"
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#10284A]">
                      <UserRound size={14} /> Designation
                      <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                        <Lock size={9} /> Admin only
                      </span>
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      readOnly
                      placeholder="Set by admin"
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#10284A]">
                      <Hash size={14} /> Employee ID
                    </label>
                    <input
                      type="text"
                      value={formData.employeeCode}
                      disabled
                      placeholder="e.g. MGR001"
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-[#10284A]">Join Date</label>
                    <input
                      type="text"
                      value={formData.joinDate}
                      disabled
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#10284A]">
                      <FileText size={14} /> Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      placeholder="Write a short bio..."
                      rows={3}
                      className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-[#2459A6]"
                    />
                  </div>
                </div>

                <p className="mt-4 text-xs text-gray-400">
                  Name, email and employee ID are maintained by the HR admin and cannot be edited here.
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isFormChanged || saving}
                    className="rounded-xl bg-[#2459A6] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e4a8c] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={!isFormChanged || saving}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManagerProfile;
