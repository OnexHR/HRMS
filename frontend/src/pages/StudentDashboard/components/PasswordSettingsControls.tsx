import { useState } from "react";
import { Eye, EyeOff, CheckCircle2, Circle, Lock } from "lucide-react";

interface PasswordInputFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export const PasswordInputField = ({
  label,
  placeholder,
  value,
  onChange,
}: PasswordInputFieldProps) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm pr-10 focus:outline-none focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

interface PasswordRequirementsChecklistProps {
  password: string;
}

export const PasswordRequirementsChecklist = ({
  password,
}: PasswordRequirementsChecklistProps) => {
  const rules = [
    { label: "At least 8 characters", test: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", test: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", test: /[a-z]/.test(password) },
    { label: "One number (0-9)", test: /[0-9]/.test(password) },
    {
      label: "One special character (!@#$%^&*)",
      test: /[!@#$%^&*]/.test(password),
    },
  ];

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 min-w-[240px]">
      <p className="text-sm font-semibold text-gray-900 mb-3">
        Password must contain :
      </p>
      <ul className="space-y-2">
        {rules.map((rule) => (
          <li key={rule.label} className="flex items-center gap-2 text-sm">
            {rule.test ? (
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            ) : (
              <Circle size={16} className="text-gray-300 shrink-0" />
            )}
            <span className={rule.test ? "text-gray-700" : "text-gray-400"}>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface UpdatePasswordButtonProps {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
}

export const UpdatePasswordButton = ({
  onClick,
  disabled,
  loading,
}: UpdatePasswordButtonProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-900 transition-colors"
    >
      <Lock size={14} />
      {loading ? "Updating..." : "Update Password"}
    </button>
  );
};