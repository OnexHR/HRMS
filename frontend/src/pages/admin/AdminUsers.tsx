import React, { useState, useEffect } from "react";
import type { ChangeEvent, FormEvent } from "react";
import axios from "axios";
import { Trash2, Edit3 } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

type AnyObj = Record<string, any>;

interface PrivateSessionRates {
  60: number | string | null;
  75: number | string | null;
  90: number | string | null;
  120: number | string | null;
}

interface GroupSessionRates {
  60: number | string | null;
  75: number | string | null;
  90: number | string | null;
  120: number | string | null;
}

interface Certification {
  id: string;
  name: string;
  certificateImage: string | File;
  year: string;
  certificateLink: string;
}

interface EmailVerification {
  isVerified: boolean;
}

interface UserProfile {
  education?: string;
  experience?: string;
  certifications?: Certification[];
  verificationStatus?: "pending" | "verified" | "rejected";
  phone?: string;
  bio?: string;
  location?: string;
  emailVerification?: EmailVerification;
  resume?: string;
  availability?: any[];
  privateSessionRate?: PrivateSessionRates;
  groupSessionRate?: GroupSessionRates;
}

interface UserForm {
  name: string;
  email: string;
  role: "student" | "trainer" | "sales";
  password: string;
  profile: UserProfile;
}

/* -------------------------- Admin Users -------------------------- */
const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AnyObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [originalCerts, setOriginalCerts] = useState<Certification[]>([]);
  const [, setRemovedCertKeys] = useState<string[]>([]);
  const [certPreviews, setCertPreviews] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState<UserForm>({
    name: "",
    email: "",
    role: "student",
    password: "",
    profile: {
      certifications: [],
      verificationStatus: "pending",
      emailVerification: {
        isVerified: false,
      },
      availability: [
        {
          day: "monday",
          startTime: "10:00",
          endTime: "11:00",
          available: true,
        },
        {
          day: "tuesday",
          startTime: "10:00",
          endTime: "10:30",
          available: true,
        },
        {
          day: "wednesday",
          startTime: "11:00",
          endTime: "11:30",
          available: true,
        },
        {
          day: "thursday",
          startTime: "10:00",
          endTime: "11:00",
          available: true,
        },
        {
          day: "friday",
          startTime: "10:00",
          endTime: "10:30",
          available: true,
        },
        { day: "saturday", startTime: null, endTime: null, available: false },
        { day: "sunday", startTime: null, endTime: null, available: false },
      ],
      resume: "",
      privateSessionRate: { 60: null, 75: null, 90: null, 120: null },
      groupSessionRate: { 60: null, 75: null, 90: null, 120: null },
    },
  });

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(Array.isArray(res.data) ? res.data : []);
      console.log("Fetched users");
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        alert("Unauthorized. Please log in again.");
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = (data: any[], filename: string) => {
    if (!data.length) {
      alert("No data to export.");
      return;
    }

    const truncate = (text: any) => {
      if (typeof text !== "string") return text;
      return text.length > 32000 ? text.slice(0, 32000) + "..." : text;
    };

    const flattened = data.map((user) => {
      const verifiedOn = user.profile?.verifiedAt || user.updatedAt;
      const daysAfterJoining =
        user.role === "trainer" &&
        user.profile?.verificationStatus === "verified"
          ? Math.floor(
              (Date.now() - new Date(verifiedOn).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : "";

      return {
        "Full Name": truncate(user.name),
        "Email Address": truncate(user.email),
        Role: user.role.charAt(0).toUpperCase() + user.role.slice(1),
        Status: user.isActive ? "Online" : "Offline",
        "Joined On": new Date(user.createdAt).toLocaleDateString(),
        "Last Updated": new Date(user.updatedAt).toLocaleDateString(),
        ...(user.role === "trainer" && {
          "Days After Joining": daysAfterJoining,
        }),

        Education: truncate(user.profile?.education),
        Experience: truncate(user.profile?.experience),
        Phone: truncate(user.profile?.phone),
        Location: truncate(user.profile?.location),
        "Verification Status": user.profile?.verificationStatus,
        Certifications: truncate(
          user.profile?.certifications
            ?.map((c: any) => `${c.name} (${c.year || ""})`)
            .join("; "),
        ),

        ...(user.role === "trainer" && {
          Languages: truncate(user.profile?.languages?.join("; ")),
          Hobbies: truncate(user.profile?.hobbies?.join("; ")),
          Specializations: truncate(user.profile?.specializations?.join("; ")),
        }),

        ...(user.role === "student" && {
          Interests: truncate(user.profile?.learningValues?.join("; ")),
        }),

        "Total Sessions": user.stats?.totalSessions,
        "Completed Sessions": user.stats?.completedSessions,
        "Total Earnings ($)": user.stats?.totalEarnings,
        "Average Rating": user.stats?.rating || user.stats?.averageRating,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(flattened);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleDownloadAll = () => downloadExcel(users, "All_Users");

  const handleDownloadStudents = () =>
    downloadExcel(
      users.filter((u) => u.role === "student"),
      "Students_Data",
    );

  const handleDownloadTrainers = () =>
    downloadExcel(
      users.filter((u) => u.role === "trainer"),
      "Trainers_Data",
    );

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    if (name.startsWith("profile.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        profile: { ...prev.profile, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // handle private session rate
  const handlePrivateRateChange = (
    duration: 60 | 75 | 90 | 120,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        privateSessionRate: {
          ...(prev.profile.privateSessionRate as PrivateSessionRates),
          [duration]: value === "" ? "" : Number(value),
        },
      },
    }));
  };

  //handle group session rate
  const handleGroupRateChange = (
    duration: 60 | 75 | 90 | 120,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        groupSessionRate: {
          ...(prev.profile.groupSessionRate as GroupSessionRates),
          [duration]: value === "" ? "" : Number(value),
        },
      },
    }));
  };
  const updateAvailability = (index: number, subfield: string, value: any) => {
    setFormData((prev) => {
      const arr = [...(prev.profile.availability || [])];
      arr[index] = { ...arr[index], [subfield]: value };
      if (subfield === "available" && !value) {
        arr[index].startTime = null;
        arr[index].endTime = null;
      }
      return { ...prev, profile: { ...prev.profile, availability: arr } };
    });
  };
  // text fields change
  const handleCertFieldChange = (
    index: number,
    field: keyof Certification,
    value: string,
  ) => {
    setFormData((prev) => {
      const certs = [...(prev.profile.certifications || [])];
      certs[index] = { ...certs[index], [field]: value };
      return { ...prev, profile: { ...prev.profile, certifications: certs } };
    });
  };

  // file selection
  const handleCertFileChange = (index: number, file: File) => {
    setFormData((prev) => {
      const certs = [...(prev.profile.certifications || [])];
      certs[index] = { ...certs[index], certificateImage: file };
      return { ...prev, profile: { ...prev.profile, certifications: certs } };
    });
  };

  const addCertification = () => {
    setFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        certifications: [
          ...(prev.profile.certifications || []),
          {
            id: crypto.randomUUID(),
            name: "",
            certificateImage: "",
            year: "",
            certificateLink: "",
          },
        ],
      },
    }));
  };

  const removeCertification = (index: number) => {
    setFormData((prev) => {
      const certs = [...(prev.profile.certifications || [])];
      const removed = certs[index];

      if (
        removed &&
        typeof removed.certificateImage === "string" &&
        removed.certificateImage.length > 0
      ) {
        setRemovedCertKeys((prevKeys) => [
          ...prevKeys,
          removed.certificateImage as string,
        ]);
      }

      certs.splice(index, 1);

      return { ...prev, profile: { ...prev.profile, certifications: certs } };
    });
  };

  const getDownloadUrl = async (key: string) => {
    const token = localStorage.getItem("token");
    const res = await axios.post(
      `${API_BASE_URL}/api/upload/get-download-url`,
      { fileKey: key },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res.data.signedUrl;
  };

  const uploadToR2 = async (file: File): Promise<string> => {
    const token = localStorage.getItem("token");

    const { data } = await axios.post(
      `${API_BASE_URL}/api/upload/get-upload-url`,
      {
        fileName: file.name,
        fileType: file.type,
        folderMain: "trainers",
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await fetch(data.uploadUrl, {
      method: "PUT",
      body: file,
    });

    return data.key;
  };

  const deleteFromR2 = async (key: string) => {
    const token = localStorage.getItem("token");
    await axios.delete(`${API_BASE_URL}/api/upload/delete-file`, {
      data: { fileKey: key },
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const uploadCertificateToR2 = async (file: File): Promise<string> => {
    const token = localStorage.getItem("token");

    const { data } = await axios.post(
      `${API_BASE_URL}/api/upload/get-upload-url`,
      {
        fileName: file.name,
        fileType: file.type,
        folderMain: "trainers",
        folderSub: "certificates",
      },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    await fetch(data.uploadUrl, {
      method: "PUT",
      body: file,
    });

    return data.key;
  };

  const handleCreateOrUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (
      !formData.name ||
      !formData.email ||
      (editingUserId === null && !formData.password)
    ) {
      setError("Name, email, and password (for new users) are required.");
      return;
    }

    try {
      // upload new resume if selected
      let resumeKey = formData.profile.resume || "";

      if (resumeFile) {
        setResumeUploading(true);
        try {
          resumeKey = await uploadToR2(resumeFile);
        } catch (err) {
          setError("Resume upload failed");
          setResumeUploading(false);
          return;
        }
        setResumeUploading(false);
      }

      const processedCerts: any[] = [];
      const removedKeys: string[] = [];

      const currentKeys = (formData.profile.certifications || [])
        .filter((c) => typeof c.certificateImage === "string")
        .map((c) => c.certificateImage);

      for (const old of originalCerts) {
        if (
          typeof old.certificateImage === "string" &&
          !currentKeys.includes(old.certificateImage)
        ) {
          removedKeys.push(old.certificateImage);
        }
      }

      for (const cert of formData.profile.certifications || []) {
        let imageKey = "";

        if (cert.certificateImage instanceof File) {
          imageKey = await uploadCertificateToR2(cert.certificateImage);
        } else if (typeof cert.certificateImage === "string") {
          imageKey = cert.certificateImage;
        }

        processedCerts.push({
          name: cert.name?.trim() || "Certificate",
          year: cert.year ? Number(cert.year) : null,
          certificateLink: cert.certificateLink || "",
          certificateImage: imageKey || "",
        });
      }

      // A sales account has no teaching side: sending the form's default
      // profile would store a weekly availability timetable, empty session
      // rates and verificationStatus "pending" on someone who is never a
      // tutor. Nothing reads those for this role, but leaving them out keeps
      // the record honest — and keeps sales users out of any future query
      // that filters on verificationStatus without also filtering on role.
      const payload =
        formData.role === "sales"
          ? {
              name: formData.name,
              email: formData.email,
              role: formData.role,
              ...(formData.password ? { password: formData.password } : {}),
            }
          : {
              ...formData,
              profile: {
                ...formData.profile,
                resume: resumeKey,
                certifications: processedCerts,
              },
            };

      if (editingUserId) {
        await axios.put(
          `${API_BASE_URL}/api/admin/users/${editingUserId}`,
          payload,
        );

        await Promise.all(removedKeys.map(deleteFromR2));
        setRemovedCertKeys([]);

        setSuccess("User updated successfully.");
        console.log("After edit success", formData);
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/users`, payload);
        setSuccess("User created successfully.");
      }

      setFormData({
        name: "",
        email: "",
        role: "student",
        password: "",
        profile: {
          certifications: [],
          verificationStatus: "pending",
          emailVerification: {
            isVerified: false,
          },
          resume: "",
        },
      });

      console.log("In handlecreate");
      setEditingUserId(null);
      fetchUsers();
      console.log("after fetch users in handlecreate ");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Operation failed.");
    }
  };

  const handleEdit = async (user: AnyObj) => {
    setOriginalCerts(user.profile?.certifications || []);
    setEditingUserId(user._id);

    const certs: Certification[] = (user.profile?.certifications || []).map(
      (c: any) => ({
        ...c,
        id: crypto.randomUUID(),
      }),
    );

    const previews: Record<number, string> = {};

    await Promise.all(
      certs.map(async (c, i) => {
        if (typeof c.certificateImage === "string" && c.certificateImage) {
          try {
            previews[i] = await getDownloadUrl(c.certificateImage);
          } catch {
            previews[i] = "";
          }
        }
      }),
    );

    setCertPreviews(previews);

    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: "",
      profile: {
        certifications: certs,
        verificationStatus: user.profile?.verificationStatus || "pending",
        emailVerification: {
          isVerified: user.profile?.emailVerification?.isVerified ?? false,
        },
        education: user.profile?.education || "",
        experience: user.profile?.experience || "",
        phone: user.profile?.phone || "",
        bio: user.profile?.bio || "",
        location: user.profile?.location || "",
        resume: user.profile?.resume || "",
        privateSessionRate: user.profile?.privateSessionRate || {
          60: null,
          75: null,
          90: null,
          120: null,
        },
        groupSessionRate: user.profile?.groupSessionRate || {
          60: null,
          75: null,
          90: null,
          120: null,
        },
      },
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full">
      <div className="glass-effect rounded-2xl p-4 sm:p-6 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
          {editingUserId ? "Edit User / Trainer" : "Create User / Trainer"}
        </h2>

        {error && (
          <div className="text-red-700 mb-3 bg-red-50 p-2 rounded">{error}</div>
        )}
        {success && (
          <div className="text-green-700 mb-3 bg-green-50 p-2 rounded">
            {success}
          </div>
        )}

        {/* === Role Selection === */}
        <div className="flex flex-wrap gap-6 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="student"
              checked={formData.role === "student"}
              onChange={handleChange}
              className="w-4 h-4 text-[#0ea5a3]"
            />
            Student
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="trainer"
              checked={formData.role === "trainer"}
              onChange={handleChange}
              className="w-4 h-4 text-[#0ea5a3]"
            />
            Trainer
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="role"
              value="sales"
              checked={formData.role === "sales"}
              onChange={handleChange}
              className="w-4 h-4 text-[#0ea5a3]"
            />
            Sales
          </label>
        </div>

        <form
          onSubmit={handleCreateOrUpdate}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
        >
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={formData.name}
            onChange={handleChange}
            className="p-3 border rounded-md w-full"
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="p-3 border rounded-md w-full"
            required
          />

          <input
            type="password"
            name="password"
            placeholder={editingUserId ? "New Password (optional)" : "Password"}
            value={formData.password}
            onChange={handleChange}
            className="p-3 border rounded-md w-full"
          />

          {/*Email Verification (Admin Override) */}
          {editingUserId && (
            <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
              <span className="text-sm font-medium text-gray-700">
                Email Verified
              </span>

              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      emailVerification: {
                        isVerified: !prev.profile.emailVerification?.isVerified,
                      },
                    },
                  }))
                }
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition
        ${
          formData.profile.emailVerification?.isVerified
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
              >
                {formData.profile.emailVerification?.isVerified
                  ? "Verified"
                  : "Not Verified"}
              </button>
            </div>
          )}

          {/* Verification Status (always visible for trainer) */}
          {formData.role === "trainer" && (
            <select
              name="profile.verificationStatus"
              value={formData.profile.verificationStatus || "pending"}
              onChange={handleChange}
              className="p-3 border rounded-md w-full"
            >
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          )}

          {formData.role === "trainer" && (
            <>
              <input
                type="text"
                name="profile.education"
                placeholder="Degree / Education"
                value={formData.profile.education || ""}
                onChange={handleChange}
                className="p-3 border rounded-md"
              />
              {/* experience */}
              <input
                type="text"
                name="profile.experience"
                placeholder="Experience (years)"
                value={formData.profile.experience || ""}
                onChange={handleChange}
                className="p-3 border rounded-md"
              />

              <div className="col-span-1 md:col-span-4 p-3 border rounded-md bg-gray-50 mb-2 mt-2">
                <label className="font-semibold block mb-2">
                  Private Session Rates ($)
                </label>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      60 Mins
                    </label>
                    <input
                      type="number"
                      value={formData.profile.privateSessionRate?.[60] ?? ""}
                      onChange={(e) =>
                        handlePrivateRateChange(60, e.target.value)
                      }
                      className="p-2 border rounded-md w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      75 Mins
                    </label>
                    <input
                      type="number"
                      value={formData.profile.privateSessionRate?.[75] ?? ""}
                      onChange={(e) =>
                        handlePrivateRateChange(75, e.target.value)
                      }
                      className="p-2 border rounded-md w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      90 Mins
                    </label>
                    <input
                      type="number"
                      value={formData.profile.privateSessionRate?.[90] ?? ""}
                      onChange={(e) =>
                        handlePrivateRateChange(90, e.target.value)
                      }
                      className="p-2 border rounded-md w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      120 Mins
                    </label>
                    <input
                      type="number"
                      value={formData.profile.privateSessionRate?.[120] ?? ""}
                      onChange={(e) =>
                        handlePrivateRateChange(120, e.target.value)
                      }
                      className="p-2 border rounded-md w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Group Session Rates */}
              <div className="col-span-1 md:col-span-4 p-3 border rounded-md bg-gray-50 mb-4">
                <label className="font-semibold block mb-2">
                  Group Session Rates ($)
                </label>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      60 Mins
                    </label>
                    <input
                      type="number"
                      value={formData.profile.groupSessionRate?.[60] ?? ""}
                      onChange={(e) =>
                        handleGroupRateChange(60, e.target.value)
                      }
                      className="p-2 border rounded-md w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      75 Mins
                    </label>
                    <input
                      type="number"
                      value={formData.profile.groupSessionRate?.[75] ?? ""}
                      onChange={(e) =>
                        handleGroupRateChange(75, e.target.value)
                      }
                      className="p-2 border rounded-md w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      90 Mins
                    </label>
                    <input
                      type="number"
                      value={formData.profile.groupSessionRate?.[90] ?? ""}
                      onChange={(e) =>
                        handleGroupRateChange(90, e.target.value)
                      }
                      className="p-2 border rounded-md w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">
                      120 Mins
                    </label>
                    <input
                      type="number"
                      value={formData.profile.groupSessionRate?.[120] ?? ""}
                      onChange={(e) =>
                        handleGroupRateChange(120, e.target.value)
                      }
                      className="p-2 border rounded-md w-full"
                    />
                  </div>
                </div>
              </div>

              {/*  Resume Management  */}
              <div className="col-span-1 md:col-span-4 p-3 border rounded-md bg-gray-50">
                <label className="font-semibold block mb-2">
                  Trainer Resume
                </label>

                <div className="flex flex-wrap gap-2 items-center">
                  {/* Upload new */}
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) =>
                        setResumeFile(e.target.files?.[0] || null)
                      }
                      className="text-sm"
                    />

                    {resumeFile && (
                      <span className="text-sm text-green-600">
                        Selected: {resumeFile.name}
                      </span>
                    )}

                    {!resumeFile && formData.profile?.resume && (
                      <span className="text-sm text-gray-600">
                        Current file uploaded
                      </span>
                    )}
                  </div>
                  {/* Preview */}
                  {formData.profile?.resume && (
                    <button
                      type="button"
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded"
                      onClick={async () => {
                        try {
                          console.log("Resume key:", formData.profile.resume);

                          const url = await getDownloadUrl(
                            formData.profile.resume!,
                          );

                          console.log("Signed URL:", url);

                          window.open(url, "_blank");
                        } catch (err) {
                          console.error("Preview failed:", err);
                          alert("Could not open resume");
                        }
                      }}
                    >
                      Preview
                    </button>
                  )}

                  {/* Delete */}
                  {formData.profile?.resume && (
                    <button
                      type="button"
                      className="px-3 py-1 bg-red-100 text-red-700 rounded"
                      onClick={async () => {
                        await deleteFromR2(formData.profile.resume!);
                        setFormData((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, resume: "" },
                        }));
                      }}
                    >
                      Delete
                    </button>
                  )}

                  {resumeUploading && (
                    <span className="text-sm text-gray-500">Uploading...</span>
                  )}
                </div>
              </div>

              {/* Certifications Section */}
              <div className="col-span-1 md:col-span-4 mt-2">
                <h4 className="font-semibold mb-2">Certifications</h4>
                {(formData.profile.certifications || []).map((cert, index) => (
                  <div
                    key={cert.id}
                    className="bg-white rounded-xl shadow-sm border p-4 space-y-4"
                  >
                    {/* Top Section */}
                    <div className="flex justify-between items-start">
                      <h5 className="font-semibold text-gray-800">
                        Certificate #{index + 1}
                      </h5>

                      <button
                        type="button"
                        onClick={() => removeCertification(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          handleCertFileChange(index, file);
                        }}
                        className="text-sm"
                      />

                      {cert.certificateImage && (
                        <img
                          src={
                            cert.certificateImage instanceof File
                              ? URL.createObjectURL(cert.certificateImage)
                              : certPreviews[index]
                          }
                          className="h-32 object-contain border rounded-lg"
                        />
                      )}
                    </div>

                    {/* Fields */}
                    <div className="grid md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Certificate Name"
                        value={cert.name}
                        onChange={(e) =>
                          handleCertFieldChange(index, "name", e.target.value)
                        }
                        className="p-2 border rounded-md"
                      />

                      <input
                        type="number"
                        placeholder="Issued Year"
                        value={cert.year || ""}
                        onChange={(e) =>
                          handleCertFieldChange(index, "year", e.target.value)
                        }
                        className="p-2 border rounded-md"
                      />

                      <input
                        type="text"
                        placeholder="Certificate Link"
                        value={cert.certificateLink}
                        onChange={(e) =>
                          handleCertFieldChange(
                            index,
                            "certificateLink",
                            e.target.value,
                          )
                        }
                        className="p-2 border rounded-md md:col-span-2"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCertification}
                  className="mt-2 w-full sm:w-auto bg-blue-100 text-blue-700 rounded-md py-2 px-4 hover:bg-blue-200"
                >
                  Add Certification
                </button>
              </div>
            </>
          )}

          {/* availability */}
          {formData.role === "trainer" && (
            <div className="col-span-1 md:col-span-4 mt-4 border-t pt-4">
              <h4 className="font-semibold mb-3">Weekly Availability</h4>
              <div className="space-y-2">
                {(formData.profile.availability || []).map((av, idx) => (
                  <div
                    key={av.day}
                    className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-20 font-medium capitalize">
                        {av.day}
                      </span>
                      <input
                        type="checkbox"
                        checked={!!av.available}
                        onChange={(e) =>
                          updateAvailability(idx, "available", e.target.checked)
                        }
                        className="w-4 h-4"
                      />
                      <span
                        className={
                          av.available ? "text-blue-600" : "text-gray-400"
                        }
                      >
                        {av.available ? "Available" : "Not Available"}
                      </span>
                    </div>
                    {av.available && (
                      <div className="flex gap-2 items-center">
                        <input
                          type="time"
                          value={av.startTime || ""}
                          onChange={(e) =>
                            updateAvailability(idx, "startTime", e.target.value)
                          }
                          className="border p-1 rounded"
                        />
                        <span>-</span>
                        <input
                          type="time"
                          value={av.endTime || ""}
                          onChange={(e) =>
                            updateAvailability(idx, "endTime", e.target.value)
                          }
                          className="border p-1 rounded"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="col-span-1 md:col-span-1 bg-[#0ea5a3] text-white p-3 rounded-md hover:shadow-lg transition"
          >
            {editingUserId ? "Update User" : "Create User"}
          </button>
        </form>

        {/* === Users List === */}
        <h3 className="text-xl font-semibold text-gray-900 mb-3">All Users</h3>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4">
          <button
            onClick={handleDownloadAll}
            className="bg-[#0ea5a3] text-white px-4 py-2 rounded-xl shadow hover:bg-[#0d8b8a] text-sm w-full sm:w-auto"
          >
            Download All Users
          </button>

          <button
            onClick={handleDownloadStudents}
            className="bg-[#38bdf8] text-white px-4 py-2 rounded-xl shadow hover:bg-[#209ac9] text-sm w-full sm:w-auto"
          >
            Download Students
          </button>

          <button
            onClick={handleDownloadTrainers}
            className="bg-[#6ee7b7] text-gray-900 px-4 py-2 rounded-xl shadow hover:bg-[#34d399] text-sm w-full sm:w-auto"
          >
            Download Trainers
          </button>
        </div>

        <div className="relative mb-4 max-w-xl">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full p-3 pr-10 text-base border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ea5a3]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-2">
          Showing {filteredUsers.length} of {users.length} users
        </p>

        <div className="space-y-2">
          {filteredUsers.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No users match "{searchQuery}".
            </p>
          )}
          {filteredUsers.map((user) => (
            <div
              key={user._id}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white/50 rounded-xl shadow gap-3"
            >
              <div className="break-all">
                <span className="font-semibold">{user.name}</span>{" "}
                <span className="text-sm text-gray-600">({user.role})</span> -{" "}
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleEdit(user)}
                  className="p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex-1 sm:flex-none justify-center flex"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(user._id)}
                  className="p-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 flex-1 sm:flex-none justify-center flex"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
