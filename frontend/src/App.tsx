import React, { useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Landingpage from "./pages/landingpage/Landingpage";
import EmployeeDashboard from "./pages/EmployeeDashboard/EmployeeDashboard";
import MyTasks from "./pages/EmployeeDashboard/Sections/MyTasks";
import ApplyForLeave from "./pages/EmployeeDashboard/Sections/ApplyForLeave";
import EmployeeProfile from "./pages/EmployeeDashboard/Sections/EmployeeProfile";
import EmployeePasswordSetting from "./pages/EmployeeDashboard/Sections/EmployeePasswordSetting";
import Announcements from "./pages/EmployeeDashboard/Sections/Announcements";
import Holidays from "./pages/EmployeeDashboard/Sections/Holidays";
import ManagerDashboard from "./pages/ManagerDashboard/ManagerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document
      .querySelectorAll<HTMLElement>("[data-route-scroll-container]")
      .forEach((container) => {
        container.scrollTop = 0;
        container.scrollLeft = 0;
      });
  }, [pathname]);

  return null;
};

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Landingpage />} />
        <Route path="/employee" element={<EmployeeDashboard />} />
        <Route path="/employee/my-tasks" element={<MyTasks />} />
        <Route path="/employee/apply-leave" element={<ApplyForLeave />} />
        <Route path="/employee/profile" element={<EmployeeProfile />} />
        <Route path="/employee/settings" element={<EmployeePasswordSetting />} />
        <Route path="/employee/announcements" element={<Announcements />} />
        <Route path="/employee/holidays" element={<Holidays />} />
        <Route path="/employee/*" element={<Navigate to="/employee" replace />} />
        <Route path="/manager/*" element={<ManagerDashboard />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
