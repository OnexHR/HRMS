import React, { useState } from "react";
import { Check, Eye, EyeOff, Loader2, Lock, Settings } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Footer2 from "../../../components/Footer2";
import { useChangePassword } from "../../../hooks/useChangePassword";

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

// Same five rules the regex above enforces, shown one by one.
const REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*]/.test(p) },
];

const CARD =
  "rounded-2xl border border-white/80 bg-white/85 shadow-[0_8px_30px_rgba(37,70,170,0.08)] backdrop-blur";

const PasswordField: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
}> = ({ label, placeholder, value, onChange, autoComplete }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="text-[16px] font-bold text-[#14226B]">{label}</label>
      <div className="relative mt-1.5">
        <input
          type={visible ? "text" : "password"}
          name={label.toLowerCase().replaceAll(" ", "-")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-xl border border-blue-100 bg-[#F5F8FF] py-3.5 pl-4 pr-12 text-[15px] font-medium text-[#14226B] outline-none transition placeholder:font-normal placeholder:text-gray-400 focus:border-[#1D5BFF] focus:bg-white"
        />
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#14226B] transition hover:bg-blue-50"
        >
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
};

const EmployeePasswordSettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    changePassword,
    loading,
    error,
    success,
    reset,
  } = useChangePassword();

  const isPasswordValid = PASSWORD_REGEX.test(newPassword);
  const canSubmit =
    currentPassword.length > 0 &&
    isPasswordValid &&
    confirmPassword.length > 0 &&
    !loading;

  const handleSubmit = async () => {
    setValidationError(null);

    if (newPassword === currentPassword) {
      setValidationError(
        "New password cannot be the same as your current password."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationError("New password and confirm password do not match.");
      return;
    }

    // Only clear the boxes once the change actually landed, otherwise a rejected
    // attempt wipes what the user typed and leaves them with nothing to retry.
    const saved = await changePassword(currentPassword, newPassword);

    if (saved) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleCancel = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setValidationError(null);
    reset();
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#E6EDFF] via-[#EFF3FF] to-[#E3EAFF] text-gray-800">
      <Sidebar active="settings" />

      <main className="ml-60 flex flex-1 flex-col">
        {/* Top bar only; this page draws its own title banner */}
        <Header hideBanner />

        <div className="flex-1 space-y-6 p-6 pt-5">
          {/* Page banner */}
          <div className="relative flex min-h-[104px] items-center overflow-hidden rounded-2xl border border-[#B8C9EF] bg-gradient-to-r from-[#DCE7FF] via-[#E7EEFF] to-[#D5E2FF] px-6 py-3 shadow-[0_12px_30px_rgba(37,70,170,0.14)]">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-blue-300/20" />
            <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-blue-300/15" />

            <div className="relative flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-[#1D4ED8] shadow-sm">
                <Settings size={25} strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-[24px] font-extrabold leading-tight text-[#14226B] sm:text-[26px]">
                  Password Settings
                </h2>
                <p className="mt-1 text-[14px] font-medium text-[#1D2A78]">
                  Manage your password and keep your account secure.
                </p>
              </div>
            </div>
          </div>

          <section className={`${CARD} p-6`}>
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E4ECFF] text-[#1D4ED8]">
                <Lock size={22} />
              </span>
              <div>
                <h3 className="text-[22px] font-extrabold leading-tight text-[#14226B]">Change Password</h3>
                <p className="text-sm text-gray-500">Use a strong password you don't use elsewhere.</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex flex-col gap-5">
                <PasswordField
                  label="Current Password"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  autoComplete="current-password"
                />

                <PasswordField
                  label="New Password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                />

                <PasswordField
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                />

                {validationError && <p className="text-sm text-rose-500">{validationError}</p>}
                {error && <p className="text-sm text-rose-500">{error}</p>}
                {success && <p className="text-sm text-green-600">Password updated successfully.</p>}

              </div>

              {/* Requirements checklist */}
              <ul className="space-y-4 border-blue-100 pt-1 lg:border-l lg:pl-8">
                {REQUIREMENTS.map((rule) => {
                  const met = rule.test(newPassword);
                  return (
                    <li key={rule.label} className="flex items-center gap-3">
                      <span
                        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition ${
                          met ? "border-green-500 bg-green-500 text-white" : "border-gray-400 bg-white"
                        }`}
                      >
                        {met && <Check size={11} strokeWidth={4} />}
                      </span>
                      <span className={`text-[15px] ${met ? "font-semibold text-green-700" : "text-gray-600"}`}>
                        {rule.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="employee-primary-action flex w-40 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition"
              >
                {loading && <Loader2 size={17} className="animate-spin" />}
                {loading ? "Updating..." : "Update Password"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="w-40 rounded-xl border border-[#1D5BFF] bg-white py-3 text-sm font-semibold text-[#1D4ED8] transition hover:bg-blue-50  disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>

        <Footer2 />
      </main>
    </div>
  );
};

export default EmployeePasswordSettings;