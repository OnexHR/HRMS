import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Loader2, Plus, RefreshCw, UserCheck, UserX, X } from "lucide-react";
import { employeeAdminApi } from "../../lib/employeeApi";
import type {
  AdminEmployeeDetail,
  AdminEmployeeListItem,
  AdminEmployeeListResponse,
  AdminEmployeeStats,
  EmployeeRole,
  ManagerOption,
} from "../../types/Employee";

// Mirrors PASSWORD_RE in backend/validators/employee/employee.validator.js.
// Duplicated on purpose: the server is still the authority, this only saves a
// round trip for an obviously weak password.
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?]).{8,}$/;
const PASSWORD_HINT =
  "At least 8 characters with one uppercase, one lowercase, one number and one special character.";

const PAGE_SIZE = 20;

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "employee" as EmployeeRole,
  phone: "",
  department: "",
  designation: "",
  manager: "",
  joinDate: "",
  status: "active",
  dateOfBirth: "",
  gender: "",
  address: "",
  emergencyContact: "",
  bio: "",
  skills: "",
};

type EmployeeForm = typeof EMPTY_FORM;

const toDateInput = (value?: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

const managerName = (manager?: ManagerOption | string | null) => {
  if (!manager || typeof manager === "string") return "";
  return `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim();
};

const fieldClass =
  "p-3 border border-gray-300 rounded-md w-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5a3]";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

const AdminEmployees: React.FC = () => {
  const [employees, setEmployees] = useState<AdminEmployeeListItem[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [stats, setStats] = useState<AdminEmployeeStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [listLoading, setListLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EmployeeForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");

  const departments = useMemo(
    () => (stats?.byDepartment ?? []).map((d) => d.department).filter(Boolean),
    [stats],
  );

  // Resolves the message and the validator's per-field list into one shape the
  // form can render.
  const readError = (err: unknown, fallback: string) => {
    const data = (err as { response?: { data?: { message?: string; errors?: unknown } } })?.response
      ?.data;
    const errors = Array.isArray(data?.errors) ? data.errors.map(String) : [];
    setError(data?.message || fallback);
    setFieldErrors(errors);
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await employeeAdminApi.get<AdminEmployeeStats>("/admin/stats");
      setStats(res.data);
    } catch {
      // Stats are decorative; the list below is the real content.
    }
  }, []);

  const fetchManagers = useCallback(async () => {
    try {
      const res = await employeeAdminApi.get<{ managers: ManagerOption[] }>("/admin/managers");
      setManagers(res.data?.managers ?? []);
    } catch {
      setManagers([]);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    setListLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (departmentFilter) params.department = departmentFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await employeeAdminApi.get<AdminEmployeeListResponse>("/admin/employees", {
        params,
      });
      setEmployees(res.data?.employees ?? []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch (err) {
      readError(err, "Could not load employees.");
      setEmployees([]);
    } finally {
      setListLoading(false);
    }
  }, [page, search, roleFilter, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchStats();
    fetchManagers();
  }, [fetchStats, fetchManagers]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(timer);
  }, [fetchEmployees]);

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, departmentFilter, statusFilter]);

  const setField = (field: keyof EmployeeForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFieldErrors([]);
    setError("");
  };

  const handleRoleChange = (role: EmployeeRole) => {
    setForm((prev) => ({
      ...prev,
      role,
      // A manager reports to nobody, and the server rejects the combination.
      manager: role === "manager" ? "" : prev.manager,
    }));
  };

  const validate = (isEdit: boolean) => {
    const problems: string[] = [];
    if (!form.firstName.trim()) problems.push("First name is required.");
    if (!form.lastName.trim()) problems.push("Last name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      problems.push("A valid email is required.");
    if (!isEdit && !PASSWORD_RE.test(form.password)) problems.push(PASSWORD_HINT);
    if (isEdit && form.password && !PASSWORD_RE.test(form.password))
      problems.push(PASSWORD_HINT);
    return problems;
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      phone: form.phone.trim(),
      department: form.department.trim(),
      designation: form.designation.trim(),
      status: form.status,
      gender: form.gender.trim(),
      address: form.address.trim(),
      emergencyContact: form.emergencyContact.trim(),
      bio: form.bio.trim(),
      skills: form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (form.joinDate) payload.joinDate = form.joinDate;
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    // Only an employee reports to somebody.
    if (form.role === "employee") payload.manager = form.manager || null;
    if (form.password) payload.password = form.password;

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors([]);
    setSuccess("");

    const isEdit = Boolean(editingId);
    const problems = validate(isEdit);
    if (problems.length) {
      setFieldErrors(problems);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await employeeAdminApi.put(`/admin/employees/${editingId}`, payload);
        setSuccess("Employee updated successfully.");
      } else {
        await employeeAdminApi.post("/admin/employees", payload);
        setSuccess("Employee created successfully.");
      }
      resetForm();
      setShowForm(false);
      await Promise.all([fetchEmployees(), fetchStats(), fetchManagers()]);
    } catch (err) {
      readError(err, "Could not save the employee.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = async (id: string) => {
    setError("");
    setFieldErrors([]);
    setSuccess("");
    setEditingId(id);
    setShowForm(true);
    setSaving(true);
    try {
      const res = await employeeAdminApi.get<{ employee: AdminEmployeeDetail }>(
        `/admin/employees/${id}`,
      );
      const e = res.data?.employee;
      if (!e) throw new Error("missing employee");
      setForm({
        firstName: e.firstName ?? "",
        lastName: e.lastName ?? "",
        email: e.email ?? "",
        password: "",
        role: e.role,
        phone: e.phone ?? "",
        department: e.department ?? "",
        designation: e.designation ?? "",
        manager: typeof e.manager === "object" && e.manager ? e.manager._id : "",
        joinDate: toDateInput(e.job?.joinDate),
        status: e.job?.status ?? "active",
        dateOfBirth: toDateInput(e.personal?.dateOfBirth),
        gender: e.personal?.gender ?? "",
        address: e.personal?.address ?? "",
        emergencyContact: e.personal?.emergencyContact ?? "",
        bio: e.profile?.bio ?? "",
        skills: (e.profile?.skills ?? []).join(", "),
      });
    } catch (err) {
      readError(err, "Could not load the employee.");
      setEditingId(null);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (employee: AdminEmployeeListItem) => {
    setError("");
    setSuccess("");
    const isActive = Boolean(employee.job?.isActive);
    if (!isActive && !confirm(`Reactivate ${employee.firstName} ${employee.lastName}?`)) return;
    if (isActive && !confirm(`Deactivate ${employee.firstName} ${employee.lastName}?`)) return;

    try {
      // The soft-delete route also detaches their reports, so route deletions
      // through the deactivate button and leave PATCH for reactivation.
      if (isActive) {
        await employeeAdminApi.delete(`/admin/employees/${employee._id}`);
      } else {
        await employeeAdminApi.patch(`/admin/employees/${employee._id}/status`, { isActive: true });
      }
      setSuccess(isActive ? "Employee deactivated." : "Employee reactivated.");
      await Promise.all([fetchEmployees(), fetchStats()]);
    } catch (err) {
      readError(err, "Could not update the employee status.");
    }
  };

  const statCards = [
    { label: "Total staff", value: stats?.total ?? "—" },
    { label: "Employees", value: stats?.byRole?.employee ?? "—" },
    { label: "Managers", value: stats?.byRole?.manager ?? "—" },
    { label: "Active", value: stats?.byStatus?.active ?? "—" },
  ];

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto w-full">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass-effect rounded-2xl p-4 shadow">
            <p className="text-sm text-gray-600">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Create / edit */}
      <div className="glass-effect rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {editingId ? "Edit Employee" : "Add Employee / Manager"}
          </h2>
          {showForm ? (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <X size={16} /> Close
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 bg-[#0ea5a3] text-white px-4 py-2 rounded-xl shadow hover:bg-[#0d8b8a] text-sm"
            >
              <Plus size={16} /> Add Employee
            </button>
          )}
        </div>

        {error && (
          <div className="text-red-700 mb-3 bg-red-50 border border-red-200 p-3 rounded">
            <p>{error}</p>
            {fieldErrors.length > 0 && (
              <ul className="list-disc pl-5 mt-1 text-sm space-y-0.5">
                {fieldErrors.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {success && (
          <div className="text-green-700 mb-3 bg-green-50 border border-green-200 p-3 rounded">
            {success}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role */}
            <div className="flex flex-wrap gap-6">
              {(["employee", "manager"] as EmployeeRole[]).map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    checked={form.role === option}
                    onChange={() => handleRoleChange(option)}
                    className="w-4 h-4 text-[#0ea5a3]"
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>First name *</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Last name *</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  Password {editingId ? "(leave blank to keep)" : "*"}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder={editingId ? "Unchanged" : "Set an initial password"}
                  className={fieldClass}
                  required={!editingId}
                />
                <p className="text-xs text-gray-500 mt-1">{PASSWORD_HINT}</p>
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Department</label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setField("department", e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Designation</label>
                <input
                  type="text"
                  value={form.designation}
                  onChange={(e) => setField("designation", e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Join date</label>
                <input
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setField("joinDate", e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Employment status</label>
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className={fieldClass}
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On leave</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </div>

              {/* A manager has no reporting manager, so the field only shows for
                  employees — the server rejects the combination too. */}
              {form.role === "employee" && (
                <div>
                  <label className={labelClass}>Reporting manager</label>
                  <select
                    value={form.manager}
                    onChange={(e) => setField("manager", e.target.value)}
                    className={fieldClass}
                  >
                    <option value="">No manager</option>
                    {managers.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.firstName} {m.lastName}
                        {m.employeeCode ? ` (${m.employeeCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelClass}>Gender</label>
                <input
                  type="text"
                  value={form.gender}
                  onChange={(e) => setField("gender", e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Date of birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setField("dateOfBirth", e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Emergency contact</label>
                <input
                  type="tel"
                  value={form.emergencyContact}
                  onChange={(e) => setField("emergencyContact", e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Skills (comma separated)</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setField("skills", e.target.value)}
                  placeholder="React, Node, MongoDB"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setField("bio", e.target.value)}
                  rows={2}
                  className={`${fieldClass} resize-none`}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0ea5a3] text-white px-5 py-2.5 rounded-md hover:shadow-lg transition disabled:opacity-60 flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editingId ? "Update Employee" : "Create Employee"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="px-5 py-2.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* List */}
      <div className="glass-effect rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Staff Directory</h3>
          <button
            type="button"
            onClick={fetchEmployees}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, code..."
            className="p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0ea5a3] text-sm"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="p-3 border rounded-lg text-sm"
          >
            <option value="">All roles</option>
            <option value="employee">Employees</option>
            <option value="manager">Managers</option>
          </select>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="p-3 border rounded-lg text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-3 border rounded-lg text-sm"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="on_leave">On leave</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          {listLoading ? "Loading..." : `Showing ${employees.length} of ${total} staff`}
        </p>

        <div className="space-y-2">
          {!listLoading && employees.length === 0 && (
            <p className="text-sm text-gray-500 italic">No staff match these filters.</p>
          )}

          {employees.map((employee) => {
            const isActive = Boolean(employee.job?.isActive);
            return (
              <div
                key={employee._id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-white/60 rounded-xl shadow gap-3"
              >
                <div className="min-w-0 break-all">
                  <p className="font-semibold text-gray-900">
                    {employee.firstName} {employee.lastName}
                    <span className="ml-2 text-xs font-normal uppercase text-gray-500">
                      {employee.role}
                    </span>
                    {employee.employeeCode && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {employee.employeeCode}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    {employee.email}
                    {employee.phone ? ` · ${employee.phone}` : ""}
                  </p>
                  <p className="text-xs text-gray-500">
                    {employee.department || "No department"}
                    {employee.designation ? ` · ${employee.designation}` : ""}
                    {managerName(employee.manager) ? ` · Reports to ${managerName(employee.manager)}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {employee.job?.status ?? (isActive ? "active" : "inactive")}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(employee._id)}
                    title="Edit"
                    className="p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(employee)}
                    title={isActive ? "Deactivate" : "Reactivate"}
                    className={`p-2 rounded-md ${
                      isActive
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    {isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2 rounded-md border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Employees sign in at the employee login with the email and password set here. Deactivating
        someone also detaches their direct reports.
      </p>
    </div>
  );
};

export default AdminEmployees;
