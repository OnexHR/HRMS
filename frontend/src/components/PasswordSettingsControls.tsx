import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

export function PasswordInputField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm outline-none focus:border-[#2459A6]"
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}

export function PasswordRequirementsChecklist({ password }: { password: string }) {
  const requirements = [
    ["At least 8 characters", password.length >= 8],
    ["One uppercase letter", /[A-Z]/.test(password)],
    ["One lowercase letter", /[a-z]/.test(password)],
    ["One number", /\d/.test(password)],
    ["One special character", /[!@#$%^&*]/.test(password)],
  ] as const;

  return (
    <ul className="space-y-2 text-xs">
      {requirements.map(([label, met]) => (
        <li key={label} className={met ? "text-green-600" : "text-gray-500"}>
          {met ? "✓" : "○"} {label}
        </li>
      ))}
    </ul>
  );
}

export function UpdatePasswordButton({
  onClick,
  disabled,
  loading,
}: {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-[#2459A6] px-4 py-2 text-sm font-semibold text-white  disabled:opacity-50"
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      Update Password
    </button>
  );
}
