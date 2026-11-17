import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type FormState = {
  orgName: string;
  adminName: string;
  email: string;
  phone: string;
  size: string;
  password: string;
  confirm: string;
};

const EMPTY: FormState = {
  orgName: "",
  adminName: "",
  email: "",
  phone: "",
  size: "",
  password: "",
  confirm: "",
};

/** "Register Your Organization" dialog opened from the landing page. */
export default function LandingpageModal({ open, onClose }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState("");
  const firstField = useRef<HTMLInputElement>(null);

  // Esc to close, lock page scroll, focus first field
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstField.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const set =
    (key: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setError("");
    };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    // TODO: call your register-organization API here, e.g.
    // await api.post("/organizations/register", form);
    console.log("Register organization", { ...form, password: "***", confirm: "***" });
    setForm(EMPTY);
    onClose();
  };

  return (
    <div
      className="lpm-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="lpm" role="dialog" aria-modal="true" aria-labelledby="lpm-title">
        <button type="button" className="lpm-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="lpm-title" className="lpm-title">Register your organization</h2>
        <p className="lpm-sub">Create a workspace for your company on OnexHR.</p>

        <form onSubmit={handleSubmit}>
          <label className="lpm-label">
            Organization name
            <input
              ref={firstField}
              type="text"
              value={form.orgName}
              onChange={set("orgName")}
              autoComplete="organization"
              required
            />
          </label>

          <div className="lpm-grid">
            <label className="lpm-label">
              Admin full name
              <input type="text" value={form.adminName} onChange={set("adminName")} autoComplete="name" required />
            </label>
            <label className="lpm-label">
              Phone
              <input type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </label>
          </div>

          <label className="lpm-label">
            Work email
            <input type="email" value={form.email} onChange={set("email")} autoComplete="email" required />
          </label>

          <label className="lpm-label">
            Company size
            <select value={form.size} onChange={set("size")} required>
              <option value="" disabled>Select a range</option>
              <option>1–10 employees</option>
              <option>11–50 employees</option>
              <option>51–200 employees</option>
              <option>201–1000 employees</option>
              <option>1000+ employees</option>
            </select>
          </label>

          <div className="lpm-grid">
            <label className="lpm-label">
              Password
              <input type="password" value={form.password} onChange={set("password")} autoComplete="new-password" required />
            </label>
            <label className="lpm-label">
              Confirm password
              <input type="password" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" required />
            </label>
          </div>

          {error && <p className="lpm-error" role="alert">{error}</p>}

          <div className="lpm-actions">
            <button type="button" className="lpm-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="lpm-submit">Create workspace</button>
          </div>
        </form>
      </div>
    </div>
  );
}