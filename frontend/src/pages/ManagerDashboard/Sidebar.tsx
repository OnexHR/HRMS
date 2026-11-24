import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Settings,
  Trophy,
  Users2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useEmployeeAuth } from "../../contexts/EmployeeAuthContext";
import logo from "../../assets/OnexHRLogo.png";

type SidebarProps = {
  active?:
    | "dashboard"
    | "team-members"
    | "leave-requests"
    | "team-attendance"
    | "performance"
    | "reports"
    | "organization"
    | "goals"
    | "announcements"
    | "help-support"
    | "profile-settings";
};

const Sidebar: React.FC<SidebarProps> = ({ active = "dashboard" }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { logout: employeeLogout } = useEmployeeAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/manager" },
    { id: "team-members", label: "My Team", icon: Users2, to: "/manager/team-members" },
    { id: "leave-requests", label: "Leave Management", icon: ClipboardList, to: "/manager/leave-requests" },
    { id: "team-attendance", label: "Attendance", icon: CalendarCheck2, to: "/manager/team-attendance" },
    { id: "performance", label: "Performance", icon: Trophy, to: "/manager/performance" },
    { id: "announcements", label: "Announcements", icon: Megaphone, to: "/manager/announcements" },
    { id: "reports", label: "Reports", icon: BarChart3, to: "/manager/reports" },
    { id: "organization", label: "Organization", icon: Building2, to: "/manager/organization" },
    { id: "profile-settings", label: "Settings", icon: Settings, to: "/manager/profile-settings" },
  ] as const;

  const handleLogout = () => {
    employeeLogout();
    logout();
    navigate("/");
  };

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-14 flex-col overflow-hidden bg-gradient-to-b from-[#0B2D6B] via-[#0A2556] to-[#071B42] text-white shadow-xl md:w-52">
      {/* Soft decorative glow at the bottom */}
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-[#1F5FE0]/20 blur-3xl" />

      <div className="relative flex h-24 items-center justify-center px-1 md:px-4">
        <Link to="/" className="flex items-center justify-center">
          <img src={logo} alt="OnexHR" className="h-8 w-8 object-contain md:h-16 md:w-auto" />
        </Link>
      </div>

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-1.5 pb-2 md:px-0">
        {navItems.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.to}
              title={item.label}
              className={`flex w-full items-center justify-center gap-3 px-2 py-2.5 text-[13px] transition md:justify-start md:px-5 ${
                isActive
                  ? "rounded-lg bg-[#1F63E8] font-semibold text-white shadow-[0_4px_14px_rgba(31,99,232,.45)] md:mx-2 md:w-[calc(100%-1rem)]"
                  : "font-medium text-blue-100/90 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={19} strokeWidth={isActive ? 2.4 : 2} />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 px-1.5 py-2 md:px-0">
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="flex w-full items-center justify-center gap-3 px-2 py-2.5 text-[13px] font-medium text-blue-100/90 transition hover:bg-white/10 hover:text-white md:justify-start md:px-5"
        >
          <LogOut size={19} />
          <span className="hidden md:inline">Logout</span>
        </button>
      </div>

      <div className="relative hidden p-3 md:block">
        <Link
          to="/manager/help-support"
          className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-center backdrop-blur transition hover:bg-white/15"
        >
          <LifeBuoy size={20} className="text-blue-100" />
          <span className="text-[13px] font-bold">Need Help?</span>
          <span className="text-[10px] text-blue-100/80">Contact HR Support</span>
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
