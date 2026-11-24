import React from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  LogOut,
  Megaphone,
  Plane,
  Search,
  Settings,
  Sun,
  Target,
  Trophy,
  UserPlus,
  UserRound,
  Users2,
} from "lucide-react";
import { useEmployeeAuth } from "../../contexts/EmployeeAuthContext";
import { getProfileImageUrl } from "../../utils/getImageUrl";
import useMyAttendance from "../../hooks/useMyAttendance";
import type { ManagerDashboardData } from "../../types/Employee";

type PendingLeave = NonNullable<ManagerDashboardData["pendingLeaves"]>[number];

type SearchItem = { label: string; description: string; to: string; icon: React.ElementType };

const SEARCH_ITEMS: SearchItem[] = [
  { label: "Dashboard", description: "Overview of your team", to: "/manager", icon: LayoutDashboard },
  { label: "My Team", description: "View and manage team members", to: "/manager/team-members", icon: Users2 },
  { label: "Leave Management", description: "Approve and track leave requests", to: "/manager/leave-requests", icon: ClipboardList },
  { label: "Attendance", description: "Team attendance overview", to: "/manager/team-attendance", icon: CalendarCheck2 },
  { label: "Performance", description: "Team performance and reviews", to: "/manager/performance", icon: Trophy },
  { label: "Announcements", description: "Company and team updates", to: "/manager/announcements", icon: Megaphone },
  { label: "Reports", description: "Generate and export reports", to: "/manager/reports", icon: BarChart3 },
  { label: "Organization", description: "Departments and structure", to: "/manager/organization", icon: Building2 },
  { label: "Settings", description: "Your profile and settings", to: "/manager/profile-settings", icon: Settings },
  { label: "Goals & Tasks", description: "Set goals and manage OKRs", to: "/manager/goals-tasks", icon: Target },
  { label: "Schedule Report", description: "Configure recurring reports", to: "/manager/schedule-report", icon: CalendarClock },
  { label: "Mark Attendance", description: "Record attendance for your team", to: "/manager/mark-attendance", icon: ClipboardCheck },
  { label: "Attendance Calendar", description: "Monthly attendance view", to: "/manager/attendance-calendar", icon: CalendarDays },
  { label: "Manage Shifts", description: "Working shift schedule", to: "/manager/manage-shifts", icon: Clock3 },
  { label: "Request Review", description: "Submit a performance review", to: "/manager/request-review", icon: ClipboardList },
  { label: "Add Employee", description: "Create an employee record", to: "/manager/add-employee", icon: UserPlus },
  { label: "Apply Leave", description: "Submit a leave request", to: "/manager/apply-leave", icon: Plane },
  { label: "Leave Policies", description: "Review leave policy balances", to: "/manager/leave-policies", icon: ClipboardCheck },
  { label: "Help & Support", description: "Contact HR support", to: "/manager/help-support", icon: LifeBuoy },
];

const useProfileImage = (imageUrl?: string) => {
  const [resolved, setResolved] = React.useState<{ imageUrl?: string; src: string }>({ src: "" });

  React.useEffect(() => {
    let active = true;
    if (!imageUrl) return;
    getProfileImageUrl(imageUrl).then(
      (src) => {
        if (active) setResolved({ imageUrl, src });
      },
      () => {
        if (active) setResolved({ imageUrl, src: "" });
      },
    );
    return () => {
      active = false;
    };
  }, [imageUrl]);

  return resolved.imageUrl === imageUrl ? resolved.src : "";
};

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
}

function leaveEmployeeName(employee: unknown) {
  if (typeof employee !== "object" || employee === null) return "Team member";
  const first = "firstName" in employee && typeof employee.firstName === "string" ? employee.firstName : "";
  const last = "lastName" in employee && typeof employee.lastName === "string" ? employee.lastName : "";
  return `${first} ${last}`.trim() || "Team member";
}

function leaveDate(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type HeaderProps = {
  notifications?: PendingLeave[];
};

const Header: React.FC<HeaderProps> = ({ notifications = [] }) => {
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  const { checkedIn, busy, loading, error, checkIn, checkOut } = useMyAttendance();
  const [query, setQuery] = React.useState("");
  const [openMenu, setOpenMenu] = React.useState<"search" | "notifications" | null>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const notificationsRef = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    const items = text
      ? SEARCH_ITEMS.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(text))
      : SEARCH_ITEMS;
    return items.slice(0, 8);
  }, [query]);

  React.useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (searchRef.current?.contains(target) || notificationsRef.current?.contains(target)) return;
      setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const goTo = (to: string) => {
    navigate(to);
    setOpenMenu(null);
    setQuery("");
  };

  const managerName =
    employee && (employee.firstName || employee.lastName)
      ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim()
      : "Manager";
  const firstName = employee?.firstName?.trim() || "Manager";

  const profileImage = useProfileImage(employee?.profile?.imageUrl);
  const initials = `${employee?.firstName?.[0] ?? ""}${employee?.lastName?.[0] ?? ""}`.toUpperCase();
  const avatarNode = profileImage ? (
    <img src={profileImage} alt={managerName} className="h-full w-full object-cover" />
  ) : (
    <span className="text-sm font-bold text-[#2459A6]">
      {initials || <UserRound size={24} strokeWidth={1.8} />}
    </span>
  );

  return (
    <header className="sticky top-0 z-10 h-16 border-b border-[#EAF0F8] bg-white/95 px-3 backdrop-blur lg:px-5">
      <div className="flex h-full items-center justify-between gap-3 lg:gap-5">
        <div ref={searchRef} className="relative shrink-0">
          <div className="flex h-10 w-10 items-center gap-3 rounded-full border border-[#DCE6F7] bg-[#EEF3FD] px-2 text-[#2459A6] lg:w-[320px] lg:max-w-[30vw] lg:justify-start lg:px-4">
            <button
              type="button"
              aria-label="Open search"
              onClick={() => setOpenMenu(openMenu === "search" ? null : "search")}
              className="grid h-6 w-6 shrink-0 place-items-center"
            >
              <Search size={17} />
            </button>
            <input
              aria-label="Search modules"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpenMenu("search");
              }}
              onFocus={() => setOpenMenu("search")}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results.length > 0) goTo(results[0].to);
              }}
              placeholder="Search modules..."
              className="hidden min-w-0 flex-1 border-0 bg-transparent text-sm text-[#10284A] outline-none placeholder:text-[#7C8CA6] lg:block"
            />
          </div>

          {openMenu === "search" && (
            <div className="absolute left-0 top-full z-50 mt-2 w-[min(360px,90vw)] overflow-hidden rounded-xl border border-[#E6ECF6] bg-white shadow-xl">
              <div className="border-b border-[#EAF0F8] px-4 py-2.5 text-[11px] font-semibold text-[#8795AA]">
                {query.trim() ? `Results for "${query.trim()}"` : "Quick navigation"}
              </div>
              <div className="p-2 lg:hidden">
                <input
                  aria-label="Search modules"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search modules..."
                  className="h-9 w-full rounded-lg border border-[#DCE6F7] px-3 text-[13px] outline-none focus:border-[#1F63E8]"
                />
              </div>
              <div className="max-h-[340px] overflow-y-auto p-1.5">
                {results.length === 0 ? (
                  <p className="px-3 py-8 text-center text-[12px] text-[#8795AA]">No modules match your search.</p>
                ) : (
                  results.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.to}
                        type="button"
                        onClick={() => goTo(item.to)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-[#F3F8FF]"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#EEF3FD] text-[#2459A6]">
                          <Icon size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-bold text-[#10284A]">{item.label}</span>
                          <span className="block truncate text-[11px] text-[#8795AA]">{item.description}</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Sun size={18} className="text-yellow-500" />
            <p className="whitespace-nowrap text-sm font-bold text-[#10284A]">
              {greeting()}, {firstName}
            </p>
          </div>

          <div className="relative flex flex-col items-end">
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => void (checkedIn ? checkOut() : checkIn())}
              title={error ?? undefined}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold text-white transition disabled:opacity-60 ${
                checkedIn ? "bg-rose-500 hover:bg-rose-600" : "bg-[#1F63E8] hover:bg-[#1850C0]"
              }`}
            >
              {checkedIn ? <LogOut size={15} /> : <LogIn size={15} />}
              <span className="hidden sm:inline">{checkedIn ? "Check Out" : "Check In"}</span>
            </button>
            {error && (
              <p className="absolute right-0 top-full mt-1 max-w-[220px] rounded bg-rose-50 px-2 py-1 text-[10px] text-rose-600 shadow-sm ring-1 ring-rose-200">
                {error}
              </p>
            )}
          </div>

          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={openMenu === "notifications"}
              onClick={() => setOpenMenu(openMenu === "notifications" ? null : "notifications")}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#2459A6] transition hover:bg-[#EEF3FD]"
            >
              <Bell size={21} />
              {notifications.length > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#EF4444] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {openMenu === "notifications" && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-xl border border-[#E6ECF6] bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-[#EAF0F8] px-4 py-3">
                  <p className="text-[13px] font-extrabold text-[#10284A]">Notifications</p>
                  <span className="rounded-full bg-[#EEF3FD] px-2 py-0.5 text-[10px] font-bold text-[#2459A6]">
                    {notifications.length} pending
                  </span>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-4 py-8 text-center text-[12px] text-[#8795AA]">No pending leave requests.</p>
                  ) : (
                    notifications.slice(0, 5).map((request, index) => (
                      <button
                        key={typeof request._id === "string" ? request._id : `notification-${index}`}
                        type="button"
                        onClick={() => goTo("/manager/leave-requests")}
                        className="flex w-full items-start gap-3 border-b border-[#F0F3F8] px-4 py-3 text-left transition hover:bg-[#F8FAFD] last:border-0"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FFF1E3] text-[#E57F1F]">
                          <ClipboardCheck size={15} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-bold text-[#10284A]">
                            {leaveEmployeeName(request.employee)}
                          </span>
                          <span className="block truncate text-[11px] text-[#617492]">
                            {String(request.leaveType)} · {leaveDate(request.fromDate)} – {leaveDate(request.toDate)}
                          </span>
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => goTo("/manager/leave-requests")}
                  className="w-full border-t border-[#EAF0F8] px-4 py-2.5 text-[12px] font-bold text-[#2459A6] transition hover:bg-[#F3F8FF]"
                >
                  View all leave requests
                </button>
              </div>
            )}
          </div>

          <div className="flex h-10 items-center gap-2 lg:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DCE9FB] ring-2 ring-[#E3EDFF]">
              {avatarNode}
            </div>
            <div className="hidden leading-tight lg:block">
              <p className="max-w-32 truncate text-[13px] font-bold text-[#10284A]">{managerName}</p>
              <p className="mt-0.5 text-[11px] text-[#7C8CA6]">Manager</p>
            </div>
            <ChevronDown size={15} className="hidden text-[#7C8CA6] lg:block" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
