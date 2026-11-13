import React from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AdminEmployees from './admin/AdminEmployees'
import { useEmployeeAuth } from '../contexts/EmployeeAuthContext'
import logo from '../assets/logo2.png'

// Minimal admin shell for the migrated AdminEmployees screen. The donor
// AdminHome/AdminDashboard bundled the whole marketing-site console; only the
// HRMS employee management route is part of this baseline.
const AdminHome: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useEmployeeAuth()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] font-GoogleSansFlex">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="LearnILM World" className="h-9 w-auto object-contain" />
            <div>
              <p className="text-sm font-bold text-[#10284A]">HRMS Administration</p>
              <p className="text-xs text-gray-500">Employee management</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8">
        <AdminEmployees />
      </main>
    </div>
  )
}

export default AdminHome
