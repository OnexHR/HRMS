import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";

const API_URL = import.meta.env.VITE_API_BASE_URL;

interface Career {
    _id: string;
    title: string;
    roleKey: string;
    category: string;
    department: string;
    location: string;
    type: string;
    paid: boolean;
    stipend: string;
    overview?: string;
    responsibilities?: string[];
    requirements?: string[];
    goodToHave?: string[];
    whatWeOffer: string[];
    education?: string;
    benefits?: string[];
    isFeatured: boolean;
    isActive: boolean;
}

interface CareerFormState {
    title: string;
    roleKey: string;
    category: string;
    department: string;
    location: string;
    type: string;
    paid: boolean;
    stipend: string;
    overview: string;
    responsibilities: string;
    requirements: string;
    goodToHave: string;
    education: string;
    whatWeOffer: string;
    benefits: string;
    isFeatured: boolean;
    isActive: boolean;
}

const EMPTY_FORM: CareerFormState = {
    title: "",
    roleKey: "",
    category: "",
    department: "",
    location: "",
    type: "Internship",
    paid: false,
    stipend: "",
    overview: "",
    responsibilities: "",
    requirements: "",
    goodToHave: "",
    education: "",
    whatWeOffer: "",
    benefits: "",
    isFeatured: false,
    isActive: true,
};

const splitLines = (value: string) =>
    value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

const joinLines = (items: string[] | undefined) => (items ?? []).join("\n");

const hasJobDescription = (career: Career) =>
    Boolean(
        career.overview?.trim() ||
            career.education?.trim() ||
            career.responsibilities?.length ||
            career.requirements?.length ||
            career.goodToHave?.length ||
            career.whatWeOffer?.length ||
            career.benefits?.length
    );

const careerToForm = (career?: Career | null): CareerFormState => ({
    title: career?.title ?? "",
    roleKey: career?.roleKey ?? "",
    category: career?.category ?? "",
    department: career?.department ?? "",
    location: career?.location ?? "",
    type: career?.type ?? "Internship",
    paid: career?.paid ?? false,
    stipend: career?.stipend ?? "",
    overview: career?.overview ?? "",
    responsibilities: joinLines(career?.responsibilities),
    requirements: joinLines(career?.requirements),
    goodToHave: joinLines(career?.goodToHave),
    education: career?.education ?? "",
    whatWeOffer: joinLines(career?.whatWeOffer),
    benefits: joinLines(career?.benefits),
    isFeatured: career?.isFeatured ?? false,
    isActive: career?.isActive ?? true,
});

const formToPayload = (form: CareerFormState) => ({
    title: form.title.trim(),
    roleKey: form.roleKey.trim(),
    category: form.category.trim(),
    department: form.department.trim(),
    location: form.location.trim(),
    type: form.type.trim(),
    paid: form.paid,
    stipend: form.paid ? form.stipend.trim() : "",
    overview: form.overview.trim(),
    responsibilities: splitLines(form.responsibilities),
    requirements: splitLines(form.requirements),
    goodToHave: splitLines(form.goodToHave),
    education: form.education.trim(),
    whatWeOffer: splitLines(form.whatWeOffer),
    benefits: splitLines(form.benefits),
    isFeatured: form.isFeatured,
    isActive: form.isActive,
});

export default function AdminCareers() {
    const [careers, setCareers] = useState<Career[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showJobDescription, setShowJobDescription] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<CareerFormState>({ ...EMPTY_FORM });
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = (msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const authHeaders = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    });

    const closeForm = () => {
        setShowForm(false);
        setShowJobDescription(false);
    };

    const fetchCareers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/careers/admin`, { headers: authHeaders() });
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setCareers(data);
        } catch {
            showToast("Failed to load careers", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCareers();
    }, []);

    const openCreate = () => {
        setForm({ ...EMPTY_FORM });
        setEditingId(null);
        setShowJobDescription(false);
        setShowForm(true);
    };

    const openEdit = (career: Career) => {
        setForm(careerToForm(career));
        setEditingId(career._id);
        setShowJobDescription(hasJobDescription(career));
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editingId
                ? `${API_URL}/api/careers/${editingId}`
                : `${API_URL}/api/careers`;
            const method = editingId ? "PUT" : "POST";
            const payload = formToPayload(form);
            const res = await fetch(url, {
                method,
                headers: authHeaders(),
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed");

            showToast(editingId ? "Career updated ✓" : "Career created ✓");
            closeForm();
            fetchCareers();
        } catch {
            showToast("Save failed", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/careers/${id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });

            if (!res.ok) throw new Error("Failed");

            showToast("Career deleted");
            setCareers((prev) => prev.filter((career) => career._id !== id));
        } catch {
            showToast("Delete failed", "error");
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const handleToggle = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/api/careers/${id}/toggle`, {
                method: "PATCH",
                headers: authHeaders(),
            });

            if (!res.ok) throw new Error("Failed");

            const updated: Career = await res.json();
            setCareers((prev) => prev.map((career) => (career._id === id ? updated : career)));
            showToast(`Career ${updated.isActive ? "activated" : "deactivated"}`);
        } catch {
            showToast("Toggle failed", "error");
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto font-sans">
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-white text-sm font-semibold shadow-lg transition ${
                        toast.type === "success" ? "bg-green-600" : "bg-red-500"
                    }`}
                >
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manage Careers</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        {careers.length} position{careers.length !== 1 ? "s" : ""} total
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-[#0052CC] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                    <Plus size={18} /> Add Position
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20 text-gray-400">
                    <Loader2 size={28} className="animate-spin mr-3" /> Loading…
                </div>
            ) : careers.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    No careers yet. Click "Add Position" to create one.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="px-5 py-3">Title</th>
                                <th className="px-5 py-3">Category</th>
                                <th className="px-5 py-3">Location</th>
                                <th className="px-5 py-3">Type</th>
                                <th className="px-5 py-3">JD</th>
                                <th className="px-5 py-3">Paid</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {careers.map((career) => (
                                <tr key={career._id} className="hover:bg-gray-50 transition">
                                    <td className="px-5 py-4 font-semibold text-gray-800">
                                        {career.title}
                                        {career.isFeatured && (
                                            <span className="ml-2 bg-green-100 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded">
                                                NEW
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-gray-600">{career.category}</td>
                                    <td className="px-5 py-4 text-gray-600">{career.location}</td>
                                    <td className="px-5 py-4 text-gray-600">{career.type}</td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                hasJobDescription(career)
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-gray-100 text-gray-700"
                                            }`}
                                        >
                                            {hasJobDescription(career) ? "✓ Set" : "Pending"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                career.paid ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                            }`}
                                        >
                                            {career.paid ? `✓ ${career.stipend}` : "Unpaid"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <button
                                            onClick={() => handleToggle(career._id)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition ${
                                                career.isActive
                                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            }`}
                                        >
                                            {career.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            {career.isActive ? "Active" : "Inactive"}
                                        </button>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => openEdit(career)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition"
                                            >
                                                <Pencil size={14} /> Edit
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(career._id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-medium transition"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showForm && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={closeForm}
                            className="absolute top-4 right-5 text-gray-400 hover:text-gray-700"
                        >
                            <X size={22} />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                            {editingId ? "Edit Position" : "Add New Position"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                                    <input
                                        value={form.title}
                                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                                        required
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="Full Stack Developer Intern"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Role Key</label>
                                    <input
                                        value={form.roleKey}
                                        onChange={(e) => setForm((p) => ({ ...p, roleKey: e.target.value }))}
                                        required
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="FULL_STACK"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                                    <input
                                        value={form.category}
                                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                                        required
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="Engineering"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                                    <input
                                        value={form.department}
                                        onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                                        required
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="Engineering"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                                    <input
                                        value={form.location}
                                        onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                                        required
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="Remote"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                                    <select
                                        value={form.type}
                                        onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        <option>Internship</option>
                                        <option>Full-time</option>
                                        <option>Part-time</option>
                                        <option>Contract</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 pt-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={form.paid}
                                        onChange={(e) => setForm((p) => ({ ...p, paid: e.target.checked }))}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    Paid
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={form.isFeatured}
                                        onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    Mark as Featured
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={form.isActive}
                                        onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                    Active
                                </label>
                            </div>

                            {form.paid && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Stipend / Salary</label>
                                    <input
                                        type="text"
                                        value={form.stipend}
                                        onChange={(e) => setForm((p) => ({ ...p, stipend: e.target.value }))}
                                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        placeholder="e.g., $500/month"
                                    />
                                </div>
                            )}

                            <div className="border-t border-gray-200 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowJobDescription((prev) => !prev)}
                                    className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
                                >
                                    <span>Job Description</span>
                                    <ChevronDown
                                        size={18}
                                        className={`transition-transform ${showJobDescription ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {showJobDescription && (
                                    <div className="mt-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Overview</label>
                                            <textarea
                                                value={form.overview}
                                                onChange={(e) => setForm((p) => ({ ...p, overview: e.target.value }))}
                                                rows={4}
                                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                placeholder="Short summary shown at the top of the job details modal"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Responsibilities</label>
                                                <textarea
                                                    value={form.responsibilities}
                                                    onChange={(e) => setForm((p) => ({ ...p, responsibilities: e.target.value }))}
                                                    rows={5}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    placeholder="One responsibility per line"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Requirements</label>
                                                <textarea
                                                    value={form.requirements}
                                                    onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))}
                                                    rows={5}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    placeholder="One requirement per line"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Good To Have</label>
                                                <textarea
                                                    value={form.goodToHave}
                                                    onChange={(e) => setForm((p) => ({ ...p, goodToHave: e.target.value }))}
                                                    rows={4}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    placeholder="One preferred skill per line"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Education</label>
                                                <textarea
                                                    value={form.education}
                                                    onChange={(e) => setForm((p) => ({ ...p, education: e.target.value }))}
                                                    rows={3}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    placeholder="Education or qualification guidance"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">What We Offer</label>
                                                <textarea
                                                    value={form.whatWeOffer}
                                                    onChange={(e) => setForm((p) => ({ ...p, whatWeOffer: e.target.value }))}
                                                    rows={4}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    placeholder="One offering per line"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-1">Benefits</label>
                                                <textarea
                                                    value={form.benefits}
                                                    onChange={(e) => setForm((p) => ({ ...p, benefits: e.target.value }))}
                                                    rows={4}
                                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                    placeholder="One benefit per line"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-sm transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className={`px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-sm transition ${
                                        saving ? "opacity-50 " : "hover:bg-blue-700"
                                    }`}
                                >
                                    {saving ? "Saving..." : editingId ? "Update" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {confirmDeleteId && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                    <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl text-center">
                        <div className="text-4xl mb-4">🗑️</div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Delete this position?</h3>
                        <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDeleteId)}
                                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}