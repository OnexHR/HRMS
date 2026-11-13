import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { EmployeeAuthProvider } from './contexts/EmployeeAuthContext'
import { MeetingProvider } from './hooks/useActiveMeeting'
import AdminPrivateRoute from './components/AdminPrivateRoute'
import EmployeePrivateRoute from './components/EmployeePrivateRoute'
import LoginPage from './pages/LoginPage'
import AdminHome from './pages/AdminHome'
import EmployeeDashboard from './pages/EmployeeDashboard/EmployeeDashboard'
import ApplyForLeave from './pages/EmployeeDashboard/Sections/ApplyForLeave'
import MyTasks from './pages/EmployeeDashboard/Sections/MyTasks'
import EmployeeProfile from './pages/EmployeeDashboard/Sections/EmployeeProfile'
import EmployeePasswordSetting from './pages/EmployeeDashboard/Sections/EmployeePasswordSetting'
import ManagerDashboard from './pages/ManagerDashboard/ManagerDashboard'
import AssignedTasks from './pages/ManagerDashboard/sections/AssignedTasks'
import ManagerProfile from './pages/ManagerDashboard/sections/ManagerProfile'
import ManagerPasswordSettings from './pages/ManagerDashboard/sections/ManagerPasswordSettings'
import ManagerQueries from './pages/ManagerDashboard/sections/Managerqueries'
import EmployeeTable from './pages/ManagerDashboard/sections/My-employee'
import ManagerReports from './pages/ManagerDashboard/sections/ManagerReports'

function App() {
  return (
    <AuthProvider>
      <EmployeeAuthProvider>
        <MeetingProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />

              {/* Employee */}
              <Route
                path="/employee"
                element={
                  <EmployeePrivateRoute allowedRoles={['employee']}>
                    <EmployeeDashboard />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/employee/apply-leave"
                element={
                  <EmployeePrivateRoute allowedRoles={['employee']}>
                    <ApplyForLeave />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/employee/my-tasks"
                element={
                  <EmployeePrivateRoute allowedRoles={['employee']}>
                    <MyTasks />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/employee/profile"
                element={
                  <EmployeePrivateRoute allowedRoles={['employee']}>
                    <EmployeeProfile />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/employee/settings"
                element={
                  <EmployeePrivateRoute allowedRoles={['employee']}>
                    <EmployeePasswordSetting />
                  </EmployeePrivateRoute>
                }
              />

              {/* Manager */}
              <Route
                path="/manager"
                element={
                  <EmployeePrivateRoute allowedRoles={['manager']}>
                    <ManagerDashboard />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/manager/assigned-tasks"
                element={
                  <EmployeePrivateRoute allowedRoles={['manager']}>
                    <AssignedTasks />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/manager/profile"
                element={
                  <EmployeePrivateRoute allowedRoles={['manager']}>
                    <ManagerProfile />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/manager/settings"
                element={
                  <EmployeePrivateRoute allowedRoles={['manager']}>
                    <ManagerPasswordSettings />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/manager/queries"
                element={
                  <EmployeePrivateRoute allowedRoles={['manager']}>
                    <ManagerQueries />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/manager/team-members"
                element={
                  <EmployeePrivateRoute allowedRoles={['manager']}>
                    <EmployeeTable />
                  </EmployeePrivateRoute>
                }
              />
              <Route
                path="/manager/reports"
                element={
                  <EmployeePrivateRoute allowedRoles={['manager']}>
                    <ManagerReports />
                  </EmployeePrivateRoute>
                }
              />

              {/* Admin */}
              <Route
                path="/admin"
                element={
                  <AdminPrivateRoute>
                    <AdminHome />
                  </AdminPrivateRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MeetingProvider>
      </EmployeeAuthProvider>
    </AuthProvider>
  )
}

export default App
