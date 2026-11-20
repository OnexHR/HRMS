import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Landingpage from "./pages/landingpage/Landingpage";
import EmployeeDashboard from "./pages/EmployeeDashboard/EmployeeDashboard";
import ManagerDashboard from "./pages/ManagerDashboard/ManagerDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landingpage />} />
        <Route path="/employee/*" element={<EmployeeDashboard />} />
        <Route path="/manager/*" element={<ManagerDashboard />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
