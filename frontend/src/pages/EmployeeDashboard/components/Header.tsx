import React from "react";
import { Bell, CalendarDays, Search, UserRound } from "lucide-react";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import { getProfileImageUrl } from "../../../utils/getImageUrl";
import type { AttendanceToday } from "../../../types/Employee";

// Resolves the R2 key to a signed URL whenever the signed-in employee changes,
// so a picture uploaded on the profile screen appears here without a reload.
// Falls back to an empty string while loading, and on failure, so the header
// shows initials rather than a broken image.
const useProfileImage = (imageUrl?: string) => {
  const [src, setSrc] = React.useState("");

  React.useEffect(() => {
    let active = true;
    if (!imageUrl) return;
    getProfileImageUrl(imageUrl).then((url) => {
      if (active) setSrc(url);
    });
    return () => {
      active = false;
    };
  }, [imageUrl]);

  return imageUrl ? src : "";
};

const EMPLOYEE_ATTENDANCE_KEY = "employee_attendance_status";
const EMPLOYEE_ATTENDANCE_EVENT = "employee-attendance-status-change";

const getStoredAttendanceStatus = (): string => {
  if (typeof window === "undefined") return "offline";
  return localStorage.getItem(EMPLOYEE_ATTENDANCE_KEY) ?? "offline";
};

// The API answers with present/on_break/leave/absent, while the locally stored
// hint uses online/offline. checkIn/checkOut is the reliable signal either way,
// because the record keeps status "present" after a checkout, so the status
// string on its own would still read as present.
const labelFor = (status: string | null | undefined, checkedIn: boolean) => {
  if (status === "on_break") return "On Break";
  if (status === "leave") return "On Leave";
  return checkedIn ? "Online" : "Offline";
};

// Pill + dot colours for the status chip on the greeting banner.
const chipFor = (label: string) => {
  if (label === "On Break") return { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  if (label === "On Leave") return { pill: "bg-blue-50 text-blue-700", dot: "bg-blue-500" };
  if (label === "Online") return { pill: "bg-green-100/80 text-green-700", dot: "bg-green-500" };
  return { pill: "bg-gray-100 text-gray-600", dot: "bg-gray-400" };
};

// Small flat illustration for the "tasks" banner (plant + person at a laptop).
const TasksIllustration: React.FC = () => (
  <svg viewBox="0 0 320 120" className="h-full w-auto" aria-hidden="true">
    {/* plant */}
    <rect x="22" y="84" width="34" height="28" rx="5" fill="#E2E8F7" />
    <path d="M39 84 C 28 66, 26 52, 34 40 C 40 52, 42 66, 39 84Z" fill="#34B27B" />
    <path d="M39 84 C 48 70, 58 62, 66 60 C 62 72, 52 80, 39 84Z" fill="#28A06C" />
    <path d="M39 84 C 30 74, 16 70, 8 72 C 14 82, 26 86, 39 84Z" fill="#4CC38A" />
    {/* desk */}
    <rect x="70" y="100" width="240" height="8" rx="4" fill="#CBD7F2" />
    {/* laptop */}
    <path d="M96 100 L108 70 H178 L190 100Z" fill="#3B82F6" />
    <circle cx="143" cy="85" r="3" fill="#fff" />
    <rect x="88" y="100" width="110" height="5" rx="2.5" fill="#1E40AF" />
    {/* person */}
    <circle cx="232" cy="38" r="17" fill="#F4B98C" />
    <path d="M215 33 C 216 18, 246 16, 249 33 C 242 26, 226 26, 215 33Z" fill="#1F2A56" />
    <rect x="212" y="56" width="42" height="46" rx="14" fill="#2563EB" />
    <path d="M214 70 C 200 78, 192 88, 188 96" stroke="#2563EB" strokeWidth="11" strokeLinecap="round" fill="none" />
    <path d="M252 70 C 258 80, 262 90, 262 100" stroke="#2563EB" strokeWidth="11" strokeLinecap="round" fill="none" />
    <rect x="206" y="92" width="62" height="12" rx="6" fill="#1E3A8A" />
  </svg>
);

const Header: React.FC<{
  attendanceToday?: AttendanceToday;
  loading?: boolean;
  onRefresh?: () => void;
  // "dashboard" shows the live status chip + avatar, "tasks" shows an illustration.
  variant?: "dashboard" | "tasks";
  subtitle?: string;
  hideBanner?: boolean;
}> = ({
  attendanceToday,
  variant = "dashboard",
  subtitle = "Here's what's happening with your work today.",
  hideBanner = false,
}) => {
  const { employee } = useEmployeeAuth();
  const [liveStatus, setLiveStatus] = React.useState<string>(getStoredAttendanceStatus());

  // Check in/out broadcasts a change so a header rendered on a page with no
  // attendance data of its own still updates straight away.
  React.useEffect(() => {
    const syncStatus = () => {
      setLiveStatus(getStoredAttendanceStatus());
    };

    window.addEventListener(EMPLOYEE_ATTENDANCE_EVENT, syncStatus);

    return () => {
      window.removeEventListener(EMPLOYEE_ATTENDANCE_EVENT, syncStatus);
    };
  }, []);

  const today = attendanceToday;

  const employeeName =
    employee && (employee.firstName || employee.lastName)
      ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim()
      : employee?.email?.split("@")[0]?.replace(/[._-]/g, " ") || "Employee User";
  const employeeId = employee?.employeeCode ?? employee?._id ?? "EMP";

  const profileImage = useProfileImage(employee?.profile?.imageUrl);
  const initials = `${employee?.firstName?.[0] ?? ""}${employee?.lastName?.[0] ?? ""}`.toUpperCase();
  const avatarNode = profileImage ? (
    <img src={profileImage} alt={employeeName} className="h-full w-full object-cover" />
  ) : (
    <span className="text-sm font-bold text-[#1D4ED8]">
      {initials || <UserRound size={20} strokeWidth={1.8} />}
    </span>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  // Freshly fetched attendance is authoritative; the stored hint is only a
  // fallback for pages that mount the header without it.
  const checkedIn = today ? Boolean(today.checkIn && !today.checkOut) : liveStatus === "online";

  const attendanceLabel = labelFor(today?.status ?? liveStatus, checkedIn);
  const chip = chipFor(attendanceLabel);

  return (
    <>
      <header className="px-6 pt-5">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <form
            role="search"
            autoComplete="off"
            onSubmit={(event) => event.preventDefault()}
            className="flex h-12 w-full max-w-[460px] flex-1 items-center gap-3 rounded-2xl border border-blue-200 bg-white px-4 shadow-[0_8px_24px_rgba(37,70,170,0.14)]"
          >
            <Search size={20} className="shrink-0 text-[#1D4ED8]" />
            <input
              type="search"
              name="q"
              autoComplete="off"
              placeholder="Search anything..."
              className="w-full bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
            />
          </form>

          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-3 whitespace-nowrap">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-200 bg-white text-[#1D4ED8] shadow-[0_8px_24px_rgba(37,70,170,0.14)] transition hover:bg-blue-50"
            >
              <Bell size={20} />
            </button>

            <div className="flex h-11 items-center gap-2.5 rounded-2xl border border-blue-200 bg-white px-4 shadow-[0_8px_24px_rgba(37,70,170,0.14)]">
              <CalendarDays size={18} className="shrink-0 text-[#1D4ED8]" />
              <span className="text-sm font-semibold text-[#14226B]">{formattedDate}</span>
            </div>

            <div className="flex h-12 items-center gap-2.5 rounded-2xl border border-blue-200 bg-white px-2.5 shadow-[0_8px_24px_rgba(37,70,170,0.14)]">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E4ECFF]">
                {avatarNode}
              </div>
              <div className="max-w-36 min-w-0 leading-tight">
                <p className="truncate text-sm font-bold text-[#14226B]">{employeeName}</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-[#52658F]">ID: {employeeId}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {!hideBanner && (
        <div className="relative mx-6 mt-5 flex min-h-[104px] flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-[#B8C9EF] bg-gradient-to-r from-[#DCE7FF] via-[#E7EEFF] to-[#D5E2FF] px-6 py-3 shadow-[0_12px_30px_rgba(37,70,170,0.14)]">
          <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-blue-300/20" />
          <div className="pointer-events-none absolute -bottom-28 right-32 h-64 w-64 rounded-full bg-blue-300/15" />

          <div className="relative min-w-0">
            <h2 className="flex items-center gap-2 text-[24px] font-extrabold leading-tight text-[#14226B] sm:text-[26px]">
              {greeting}, {employeeName}!
            </h2>
            <p className="mt-1 text-[14px] font-medium text-[#1D2A78]">{subtitle}</p>
          </div>

          {variant === "dashboard" ? (
            <div className="relative flex shrink-0 flex-col items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300/70 bg-gradient-to-r from-[#3478FF] to-[#173DA8] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-[0_5px_16px_rgba(29,91,255,0.35)] ring-1 ring-white/70">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                  <UserRound size={12} strokeWidth={2.4} />
                </span>
                Employee
              </span>
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold ${chip.pill}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${chip.dot}`} />
                {attendanceLabel}
              </span>
            </div>
          ) : (
            <div className="relative hidden h-24 shrink-0 md:block">
              <TasksIllustration />
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Header;