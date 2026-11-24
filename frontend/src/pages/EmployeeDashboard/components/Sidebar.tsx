import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ListChecks,
  FilePlus2,
  CalendarDays,
  Megaphone,
  UserRound,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import logo from "../../../assets/OnexHRLogo.png";

type SidebarProps = {
  active?:
    | "dashboard"
    | "my-tasks"
    | "apply-leave"
    | "holidays"
    | "announcements"
    | "profile"
    | "settings";
};

const Sidebar: React.FC<SidebarProps> = ({ active = "dashboard" }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { logout: employeeLogout } = useEmployeeAuth();

  const navItems = [
    {
      id: "dashboard",
      label: "Overview",
      icon: LayoutDashboard,
      to: "/employee",
    },
    {
      id: "my-tasks",
      label: "Worklist",
      icon: ListChecks,
      to: "/employee/my-tasks",
    },
    {
      id: "apply-leave",
      label: "Leave Request",
      icon: FilePlus2,
      to: "/employee/apply-leave",
    },
    {
      id: "announcements",
      label: "Announcements",
      icon: Megaphone,
      to: "/employee/announcements",
    },
    {
      id: "holidays",
      label: "Holidays",
      icon: CalendarDays,
      to: "/employee/holidays",
    },
    {
      id: "profile",
      label: "Profile",
      icon: UserRound,
      to: "/employee/profile",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      to: "/employee/settings",
    },
  ] as const;

  const handleLogout = () => {
    employeeLogout();
    logout();
    navigate("/");
  };

  return (
    <aside
      onWheelCapture={(event) => event.preventDefault()}
      className="fixed left-0 top-0 z-30 flex h-screen w-60 min-w-[15rem] shrink-0 flex-col overflow-hidden overscroll-none rounded-r-xl border-r border-blue-950/20 bg-gradient-to-b from-[#0B1F4D] via-[#123A85] to-[#1D4ED8] text-white shadow-lg"
    >
      <div className="flex h-24 shrink-0 items-center justify-center px-5">
        <div className="flex min-w-0 items-center justify-center">
          <div className="employee-sidebar-logo translate-y-3">
            <Link
              to="/"
              className="relative z-10 flex h-full w-full items-center justify-center"
            >
              <img
                src={logo}
                alt="OnexHR"
                className="h-12 w-auto object-contain opacity-90 md:h-14"
              />
            </Link>
          </div>
        </div>
      </div>

      <nav className="mt-10 flex-1 space-y-2 px-4">
        {navItems.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.to}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] transition ${
                isActive
                  ? "bg-white font-semibold text-[#1D4ED8] shadow-md ring-1 ring-blue-100"
                  : "font-medium text-blue-50 hover:bg-white/10"
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/15 px-4 pb-4 pt-2">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] font-medium text-blue-50 transition hover:bg-rose-500/20 hover:text-rose-100"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;