// import React from "react";
// import { Link, useNavigate } from "react-router-dom";
// import {
//   LayoutDashboard,
//   Users2,
//   ClipboardList,
//   BarChart3,
//   UsersRound,
//   CalendarDays,
//   UserRound,
//   Settings,
//   LogOut,
// } from "lucide-react";
// import { useAuth } from "../../../contexts/AuthContext";
// import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
// import logo from "../../../assets/logo2.png";


// type SidebarProps = {
//   active?:
//     | "dashboard"
//     | "team-attendance"
//     | "assigned-tasks"
//     | "my-calendar"
//     | "reports"
//     | "team-members"
//     | "profile"
//     | "settings";
// };

// const Sidebar: React.FC<SidebarProps> = ({ active = "dashboard" }) => {
//   const navigate = useNavigate();
//   const { logout } = useAuth();
//   const { logout: employeeLogout } = useEmployeeAuth();

//   const navItems = [
//     {
//       id: "dashboard",
//       label: "Dashboard",
//       icon: LayoutDashboard,
//       to: "/manager",
//     },
    
//     {
//       id: "assigned-tasks",
//       label: "Assigned Tasks",
//       icon: ClipboardList,
//       to: "/manager/assigned-tasks",
//     },
//     {
//       id: "team-members",
//       label: "Team Members",
//       icon: UsersRound,
//       to: "/manager/team-members",
//     },
//     { id: "query", label: "Queries", icon: Users2, to: "/manager/queries" },
//     {
//       id: "profile",
//       label: "Profile",
//       icon: UserRound,
//       to: "/manager/profile",
//     },
//     {
//       id: "settings",
//       label: "Settings",
//       icon: Settings,
//       to: "/manager/settings",
//     },
//   ] as const;

//   const handleLogout = () => {
//     employeeLogout();
//     logout();
//     navigate("/");
//   };

//   return (
//     <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col bg-[#10284A] text-white shadow-lg">
//       <div className="flex h-20 items-center border-b border-white/10 px-5">
//         <div className="flex min-w-0 items-center gap-3">
//           <div className="w-fit  items-center pl-1 md:pl-4 h-20">
//           <Link to="/" className="h-full flex items-center">
//             <img
//               src={logo}
//               alt="LearnILM World"
//               className="h-8 md:h-10 w-auto object-contain"
//             />
//           </Link>
//         </div>
//           {/* <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
//             <img
//               src="/web-app-manifest-512x512.png"
//               alt="LearnILmWorld"
//               className="h-full w-full object-cover"
//             />
//           </div>

//           <div className="w-[145px]">
//             <h1 className="whitespace-nowrap text-[17px] font-bold">
//               LearnILM
//             </h1>

//             <p className="whitespace-nowrap text-xs text-blue-200">
//               Manager Portal
//             </p>
//           </div> */}
//         </div>
//       </div>

//       <nav className="mt-7 flex-1 space-y-2 px-4">
//         {navItems.map((item) => {
//           const isActive = item.id === active;

//           return (
//             <Link
//               key={item.id}
//               to={item.to}
//               className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
//                 isActive
//                   ? "bg-[#2459A6] font-semibold shadow-sm"
//                   : "font-medium text-blue-100 hover:bg-white/10"
//               }`}
//             >
//               <item.icon size={20} />
//               <span>{item.label}</span>
//             </Link>
//           );
//         })}
//       </nav>

//       <div className="border-t border-white/10 p-4">
//         <button
//           type="button"
//           onClick={handleLogout}
//           className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
//         >
//           <LogOut size={20} />
//           <span>Log Out</span>
//         </button>
//       </div>
//     </aside>
//   );
// };

// export default Sidebar;
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  LayoutDashboard,
  Users2,
  ClipboardList,
  UsersRound,
  UserRound,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import logo from "../../../assets/logo2.png";


type SidebarProps = {
  active?:
    | "dashboard"
    | "team-attendance"
    | "assigned-tasks"
    | "my-calendar"
    | "reports"
    | "team-members"
    | "query"
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
      label: "Dashboard",
      icon: LayoutDashboard,
      to: "/manager",
    },
    {
      id: "assigned-tasks",
      label: "Assigned Tasks",
      icon: ClipboardList,
      to: "/manager/assigned-tasks",
    },
    {
      id: "team-members",
      label: "Team Members",
      icon: UsersRound,
      to: "/manager/team-members",
    },
    { id: "reports", label: "Reports", icon: BarChart3, to: "/manager/reports" },
    { id: "query", label: "Queries", icon: Users2, to: "/manager/queries" },
    {
      id: "profile",
      label: "Profile",
      icon: UserRound,
      to: "/manager/profile",
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      to: "/manager/settings",
    },
  ] as const;

  const handleLogout = () => {
    employeeLogout();
    logout();
    navigate("/");
  };

  return (
    <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col bg-[#10284A] text-white shadow-lg">
      <div className="flex h-20 items-center border-b border-white/10 px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-20 w-fit items-center pl-1 md:pl-4">
            <Link to="/" className="flex h-full items-center">
              <img
                src={logo}
                alt="LearnILM World"
                className="h-8 w-auto object-contain md:h-10"
              />
            </Link>
          </div>
        </div>
      </div>

      <nav className="mt-7 flex-1 space-y-2 px-4">
        {navItems.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              to={item.to}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${
                isActive
                  ? "bg-[#2459A6] font-semibold shadow-sm"
                  : "font-medium text-blue-100 hover:bg-white/10"
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
        >
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;