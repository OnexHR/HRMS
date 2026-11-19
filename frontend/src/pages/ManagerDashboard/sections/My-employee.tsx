import React from "react";
import { Trophy, Search, UserPlus, UserMinus, X, Check, Loader2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import employeeApi from "../../../lib/employeeApi";
import type { AvailableEmployee } from "../../../types/Employee";

function describeErrors(err: any, fallback: string) {
  const data = err?.response?.data;
  const details = Array.isArray(data?.errors) ? data.errors.filter(Boolean) : [];
  if (details.length) return details.join(' ');
  return data?.message || fallback;
}

type EmployeeRow = {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
  department?: string;
  job?: { joinDate?: string };
};

type EmployeeDetail = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  employeeCode?: string;
  manager?: { firstName?: string; lastName?: string; employeeCode?: string } | null;
  job?: { joinDate?: string; status?: string; isActive?: boolean };
  personal?: { gender?: string; address?: string };
  profile?: { bio?: string };
};

const EmployeeTable: React.FC = () => {
  const [search, setSearch] = React.useState("");
  const [employees, setEmployees] = React.useState<EmployeeRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showPicker, setShowPicker] = React.useState(false);
  const [selectedEmployee, setSelectedEmployee] = React.useState<EmployeeDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [available, setAvailable] = React.useState<AvailableEmployee[]>([]);
  const [availableLoading, setAvailableLoading] = React.useState(false);
  const [availableError, setAvailableError] = React.useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = React.useState("");
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const fetchEmployees = React.useCallback(async () => {
    try {
      const res = await employeeApi.get<{ members: EmployeeRow[] }>('/team');
      setEmployees(res.data.members ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not load team members.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const fetchAvailable = React.useCallback(async () => {
    setAvailableLoading(true);
    setAvailableError(null);
    try {
      const res = await employeeApi.get<{ employees: AvailableEmployee[] }>('/team/available');
      setAvailable(res.data.employees ?? []);
    } catch (err: any) {
      setAvailable([]);
      setAvailableError(err.response?.data?.message || 'Could not load employees.');
    } finally {
      setAvailableLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!showPicker) return;
    setPickerSearch('');
    fetchAvailable();
  }, [showPicker, fetchAvailable]);

  const handleAddMember = async (employee: AvailableEmployee) => {
    setAddingId(employee._id);
    setSuccess(null);
    setError(null);

    try {
      await employeeApi.post('/team/assign', { employeeId: employee._id });
      const name = `${employee.firstName} ${employee.lastName}`.trim();
      setSuccess(`${name} was added to your team.`);
      await fetchEmployees();
      await fetchAvailable();
    } catch (err: any) {
      setError(describeErrors(err, 'Could not add employee to your team.'));
      await fetchAvailable();
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveMember = async (employee: EmployeeRow) => {
    setRemovingId(employee._id);
    setSuccess(null);
    setError(null);
    setConfirmingId(null);

    try {
      await employeeApi.delete(`/team/assign/${employee._id}`);
      const name = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();
      setSuccess(`${name} was removed from your team.`);
      await fetchEmployees();
      if (showPicker) await fetchAvailable();
    } catch (err: any) {
      setError(describeErrors(err, 'Could not remove employee from your team.'));
    } finally {
      setRemovingId(null);
    }
  };

  const filteredAvailable = available.filter((emp) => {
    const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
    const text = `${name} ${emp.department ?? ''} ${emp.designation ?? ''} ${emp.employeeCode ?? ''} ${emp.role === 'manager' ? 'manager' : ''}`.toLowerCase();
    return text.includes(pickerSearch.toLowerCase());
  });

  const handleViewMore = async (employeeId: string) => {
    setDetailsLoading(true);
    setDetailsError(null);

    try {
      const response = await employeeApi.get<{ member: EmployeeDetail }>(`/team/member/${employeeId}`);
      setSelectedEmployee(response.data.member ?? null);
    } catch (err: any) {
      setDetailsError(err.response?.data?.message || 'Could not load employee details.');
      setSelectedEmployee(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const name = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim();
    const text = `${name} ${emp.department ?? ""} ${emp.employeeCode ?? ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 text-gray-800">
      <Sidebar active="team-members" />

      <main className="ml-60">
        <Header />

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-[#10284A]" />
              <h3 className="text-lg font-semibold text-[#10284A]">Employee Details</h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employees..."
                  className="w-48 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowPicker((current) => !current)}
                className="flex items-center gap-2 rounded-xl bg-[#2459A6] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1e4a8c]"
              >
                <UserPlus size={16} />
                Add Employee
              </button>
            </div>
          </div>

          {showPicker && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold text-[#10284A]">All employees &amp; managers</h4>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  aria-label="Close employee picker"
                  className="rounded-full p-1 text-gray-500 hover:bg-white hover:text-gray-700"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search by name, code, department or role..."
                  className="w-full bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
                />
              </div>

              {availableError && <p className="mt-3 text-sm text-rose-600">{availableError}</p>}

              <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                {availableLoading ? (
                  <p className="flex items-center gap-2 px-4 py-6 text-sm text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    Loading employees…
                  </p>
                ) : filteredAvailable.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400">No employees match your search.</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {filteredAvailable.map((emp) => {
                      const name = `${emp.firstName} ${emp.lastName}`.trim();
                      const initials = `${emp.firstName?.[0] ?? ""}${emp.lastName?.[0] ?? ""}`.toUpperCase();
                      const adding = addingId === emp._id;

                      return (
                        <li key={emp._id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[#2459A6]">
                              {initials}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-[#10284A]">{name}</p>
                                {emp.role === 'manager' && (
                                  <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                                    Manager
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs text-gray-500">
                                {emp.employeeCode ?? '-'}
                                {emp.designation ? ` · ${emp.designation}` : emp.department ? ` · ${emp.department}` : ''}
                              </p>
                            </div>
                          </div>

                          {emp.inTeam ? (
                            <span className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600">
                              <Check size={14} />
                              On your team
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={adding}
                              onClick={() => handleAddMember(emp)}
                              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#2459A6] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1e4a8c] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                              {adding ? 'Adding…' : 'Add'}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {success && <p className="mt-3 text-sm text-emerald-600">{success}</p>}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          {selectedEmployee && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Employee details</p>
                    <h4 className="mt-1 text-xl font-bold text-[#10284A]">
                      {selectedEmployee.firstName ?? ""} {selectedEmployee.lastName ?? ""}
                    </h4>
                  </div>
                  <button type="button" onClick={() => setSelectedEmployee(null)} className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>

                {detailsLoading ? (
                  <p className="mt-4 text-sm text-gray-500">Loading employee details…</p>
                ) : detailsError ? (
                  <p className="mt-4 text-sm text-rose-600">{detailsError}</p>
                ) : (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Employee code</p>
                      <p className="mt-2 text-sm font-semibold text-[#10284A]">{selectedEmployee.employeeCode ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Department</p>
                      <p className="mt-2 text-sm font-semibold text-[#10284A]">{selectedEmployee.department ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Designation</p>
                      <p className="mt-2 text-sm font-semibold text-[#10284A]">{selectedEmployee.designation ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Status</p>
                      <p className="mt-2 text-sm font-semibold text-[#10284A]">{selectedEmployee.job?.status ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Email</p>
                      <p className="mt-2 text-sm font-semibold text-[#10284A]">{selectedEmployee.email ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Phone</p>
                      <p className="mt-2 text-sm font-semibold text-[#10284A]">{selectedEmployee.phone ?? "-"}</p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Manager</p>
                      <p className="mt-2 text-sm font-semibold text-[#10284A]">
                        {selectedEmployee.manager ? `${selectedEmployee.manager.firstName ?? ""} ${selectedEmployee.manager.lastName ?? ""}`.trim() : "-"}
                      </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3 md:col-span-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Bio</p>
                      <p className="mt-2 text-sm text-gray-700">{selectedEmployee.profile?.bio || "No bio added yet."}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-medium text-gray-400">
                  <th className="pb-3 pr-4 font-medium">Employee ID</th>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Department</th>
                  <th className="pb-3 pr-4 font-medium">Join Date</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-400">Loading team members…</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-400">No employees match your search.</td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const name = `${emp.firstName} ${emp.lastName}`.trim();
                    const initials = `${emp.firstName?.[0] ?? ""}${emp.lastName?.[0] ?? ""}`.toUpperCase();
                    const joinDate = emp.job?.joinDate ? new Date(emp.job.joinDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";
                    return (
                      <tr key={emp._id} className="text-sm">
                        <td className="py-3.5 pr-4 font-medium text-[#10284A]">{emp.employeeCode ?? "-"}</td>
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-[#2459A6]">{initials}</div>
                            <span className="font-medium text-[#10284A]">{name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-gray-600">{emp.department ?? "-"}</td>
                        <td className="py-3.5 pr-4 text-gray-600">{joinDate}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewMore(emp._id)}
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#2459A6] transition hover:bg-gray-50"
                            >
                              View More
                            </button>
                            {confirmingId === emp._id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Remove?</span>
                                <button
                                  type="button"
                                  disabled={removingId === emp._id}
                                  onClick={() => handleRemoveMember(emp)}
                                  className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {removingId === emp._id ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                                  {removingId === emp._id ? 'Removing…' : 'Yes, remove'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingId(null)}
                                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingId(emp._id)}
                                className="flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                              >
                                <UserMinus size={14} />
                                Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EmployeeTable;
