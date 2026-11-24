import React from "react";
import { UserPlus } from "lucide-react";
import { Card, CardTitle, InfoModal, PageShell } from "../ui";

const AddEmployee: React.FC = () => {
  const [form, setForm] = React.useState({ firstName: "", lastName: "", email: "", department: "", designation: "" });
  const [notice, setNotice] = React.useState<string | null>(null);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = () => {
    setNotice(
      form.firstName.trim() && form.email.trim()
        ? `Employee ${form.firstName.trim()} ${form.lastName.trim()} has been added with email ${form.email.trim()}.`
        : "Please provide at least a first name and email address.",
    );
  };

  const fields: Array<[keyof typeof form, string, string]> = [
    ["firstName", "First name", "e.g. Ayesha"],
    ["lastName", "Last name", "e.g. Khan"],
    ["email", "Email address", "name@example.com"],
    ["department", "Department", "e.g. Engineering"],
    ["designation", "Designation", "e.g. Software Engineer"],
  ];

  return (
    <PageShell crumb="Add Employee" title="Add Employee" subtitle="Create a new employee record in your organization." icon={UserPlus}>
      <Card>
        <CardTitle icon={UserPlus} title="Employee details" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(([key, label, placeholder]) => (
            <label key={key} className="block">
              <span className="text-[12px] font-semibold text-[#4B5F7D]">{label}</span>
              <input value={form[key]} onChange={update(key)} placeholder={placeholder} className="mt-1.5 h-10 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]" />
            </label>
          ))}
        </div>
        <button type="button" onClick={submit} className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[#1F63E8] px-5 text-[13px] font-bold text-white hover:bg-[#1850C0]">
          <UserPlus size={16} /> Add Employee
        </button>
      </Card>
      {notice && <InfoModal title="Add Employee" message={notice} onClose={() => setNotice(null)} />}
    </PageShell>
  );
};

export default AddEmployee;
