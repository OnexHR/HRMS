import { useState } from "react";
import type { FormEvent } from "react";
import bgImage from "../../assets/landingpagebg.webp";
import logo from "../../assets/OnexHRLogo.png";
import Footer from "../../components/Footer";
import LandingpageModal from "./LandingpageModal";
import "./Landingpage.css";

/* ---------- tiny inline icons (no extra library needed) ---------- */
type IconProps = { size?: number };
const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});
const MailIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
);
const LockIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /><circle cx="12" cy="16" r="1" /></svg>
);
const EyeIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);
const EyeOffIcon = ({ size = 22 }: IconProps) => (
  <svg {...base(size)}><path d="M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.6A16.6 16.6 0 0 0 2 12s4 6 10 6c1.5 0 2.9-.4 4.1-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
);
const BoltIcon = ({ size = 20 }: IconProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" /></svg>
);
const UsersIcon = ({ size = 30 }: IconProps) => (
  <svg {...base(size)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.8 0 4.5 1.8 4.5 4.5" /></svg>
);
const CalendarIcon = ({ size = 30 }: IconProps) => (
  <svg {...base(size)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h2M12 14h2M16 14h.01M8 17.5h2M12 17.5h2" /></svg>
);
const ChartIcon = ({ size = 30 }: IconProps) => (
  <svg {...base(size)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /><path d="m13 7 3-3 3 3" /></svg>
);
const SignInIcon = ({ size = 24 }: IconProps) => (
  <svg {...base(size)}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5M15 12H3" /></svg>
);
const BuildingIcon = ({ size = 40 }: IconProps) => (
  <svg {...base(size)}><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3" /></svg>
);
const ChevronIcon = ({ size = 16 }: IconProps) => (
  <svg {...base(size)}><path d="m9 6 6 6-6 6" /></svg>
);

/* ---------- animated waves ---------- */
/**
 * Builds a seamless horizontal wave over TWO periods (viewBox 2880 wide).
 * The <svg> is rendered at 200% width and slid by -50%, which is exactly
 * one period, so the loop never shows a seam.
 */
const wavePath = (y: number, amp: number) =>
  `M0 ${y} C240 ${y - amp} 480 ${y - amp} 720 ${y} C960 ${y + amp} 1200 ${y + amp} 1440 ${y} ` +
  `C1680 ${y - amp} 1920 ${y - amp} 2160 ${y} C2400 ${y + amp} 2640 ${y + amp} 2880 ${y} V400 H0 Z`;

type WaveProps = {
  id: string;
  className: string;
  from: string;
  to: string;
  y: number;
  amp: number;
};

const Wave = ({ id, className, from, to, y, amp }: WaveProps) => (
  <div className={`lp-wave ${className}`}>
    <svg viewBox="0 0 2880 400" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <path d={wavePath(y, amp)} fill={`url(#${id})`} />
    </svg>
  </div>
);

/* ---------- page ---------- */
export default function Landingpage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const handleSignIn = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: call your login API here, e.g.
    // await api.post("/auth/login", { identifier, password, remember });
    console.log("Sign in", { identifier, remember });
  };

  return (
    <div className="lp">
      {/* background photo + readability fade */}
      <div className="lp-bg" style={{ backgroundImage: `url(${bgImage})` }} />

      {/* moving waves (behind all content) */}
      <div className="lp-waves lp-waves--top" aria-hidden="true">
        <Wave id="lpg-top" className="lp-wave--top-1" from="#7fb6ff" to="#2f7bff" y={150} amp={70} />
      </div>
      <div className="lp-waves lp-waves--bottom" aria-hidden="true">
        <Wave id="lpg-1" className="lp-wave--1" from="#8fc2ff" to="#3b8cff" y={110} amp={60} />
        <Wave id="lpg-2" className="lp-wave--2" from="#2f86ff" to="#0b57d0" y={130} amp={80} />
        <Wave id="lpg-3" className="lp-wave--3" from="#0b5ce0" to="#062a78" y={150} amp={55} />
      </div>

      <main className="lp-main">
        {/* ---------- left: hero ---------- */}
        <section className="lp-hero">
          <img className="lp-logo" src={logo} alt="OnexHR" />

          <span className="lp-badge">
            <BoltIcon /> Smart HR. Smarter Future.
          </span>

          <h1 className="lp-title">
            Smarter HR.
            <br />
            <span className="lp-title-accent">Stronger</span> Teams.
          </h1>

          <p className="lp-lead">
            OnexHR helps you manage your people, processes and performance — all in one place.
          </p>

          <div className="lp-features">
            <div className="lp-feature">
              <UsersIcon />
              <span>Employee Management</span>
            </div>
            <div className="lp-feature">
              <CalendarIcon />
              <span>Attendance &amp; Leave Management</span>
            </div>
            <div className="lp-feature">
              <ChartIcon />
              <span>Performance Analytics</span>
            </div>
          </div>
        </section>

        {/* ---------- right: sign in card ---------- */}
        <section className="lp-card" aria-labelledby="lp-welcome">
          <img className="lp-card-logo" src={logo} alt="OnexHR" />
          <h2 id="lp-welcome" className="lp-welcome">Welcome Back!</h2>
          <p className="lp-welcome-sub">Sign in to your OnexHR account</p>

          <form onSubmit={handleSignIn} noValidate>
            <label className="lp-field">
              <span className="lp-field-icon"><MailIcon /></span>
              <input
                type="text"
                placeholder="Work Email / Username"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                aria-label="Work email or username"
                required
              />
            </label>

            <label className="lp-field">
              <span className="lp-field-icon"><LockIcon /></span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label="Password"
                required
              />
              <button
                type="button"
                className="lp-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </label>

            <div className="lp-row">
              <label className="lp-check">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember Me</span>
              </label>
              <a href="#" className="lp-link">Forgot Password?</a>
            </div>

            <button type="submit" className="lp-signin">
              <SignInIcon /> Sign In
            </button>
          </form>

          <div className="lp-or"><span>OR</span></div>

          <div className="lp-org">
            <div className="lp-org-top">
              <BuildingIcon />
              <div>
                <strong>New Organization?</strong>
                <p>Create your organization’s workspace on OnexHR.</p>
              </div>
            </div>
            <button type="button" className="lp-register" onClick={() => setRegisterOpen(true)}>
              <span className="lp-register-icon"><BuildingIcon size={22} /></span>
              Register Your Organization
              <ChevronIcon />
            </button>
          </div>
        </section>
      </main>

      <Footer />

      <LandingpageModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  );
}