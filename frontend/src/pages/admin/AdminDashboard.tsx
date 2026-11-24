// src/pages/AdminDashboard.tsx
import React, { useState } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, UserPlus, Users, Calendar, FilePlus, LogOut, X, BookOpen, Menu, Briefcase, UserCog } from 'lucide-react'
// Eye, Menu, Trash2, Edit3, TrendingUp, User, removed from lucide icons
// import { useAuth } from '../../contexts/AuthContext'
import AdminSessions from './AdminSessions'
import AdminReviews from './AdminReviews'

// import * as XLSX from 'xlsx'
// import { saveAs } from 'file-saver'
import AdminCourses from './AdminCourses'
import AdminTrainers from './AdminTrainers'
import AdminUsers from './AdminUsers'
// import AdminHome from '../AdminHome'
import AdminStudents from './AdminStudents'
import AdminCareers from './AdminCareers'
import AdminHeroTutors from './AdminHeroTutors'
import AdminEmployees from './AdminEmployees'
import Footer2 from '../../components/Footer2'

// interface Certification {
//   name: string
//   certificateImage: string
//   year: string
//   certificateLink: string
// }

// interface UserProfile {
//   education?: string
//   experience?: string
//   certifications?: Certification[]
//   verificationStatus?: 'pending' | 'verified' | 'rejected'
//   phone?: string
//   bio?: string
// }


// interface UserForm {
//   name: string
//   email: string
//   role: 'student' | 'trainer'
//   password: string
//   profile: UserProfile
// }

// interface Session {
//   _id: string
//   title: string
//   trainer?: { name: string; email: string }
//   status?: string
//   createdAt?: string
// }

// const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/* -------------------------- Admin Dashboard Root -------------------------- */
const AdminDashboard: React.FC = () => {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigation = [
    { name: 'Home', href: '/admin', icon: Home },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Staff', href: '/admin/employees', icon: UserCog },
    { name: 'Trainers', href: '/admin/trainers', icon: UserPlus },
    { name: 'Students', href: '/admin/students', icon: UserPlus },
    { name: 'Sessions', href: '/admin/sessions', icon: Calendar },
    { name: 'Courses', href: '/admin/courses', icon: BookOpen },
    { name: 'Careers', href: '/admin/careers', icon: Briefcase },
    { name: 'Reviews', href: '/admin/reviews', icon: FilePlus },
    { name: 'Hero Tutors', href: '/admin/hero-tutors', icon: Users },
  ]

  const navigate = useNavigate()

  const handleLogout = () => {
    sessionStorage.removeItem('hrms.demo.accessToken')
    sessionStorage.removeItem('hrms.demo.user')
    // Sign-in is a global modal, not a page — there is no /login route, so
    // navigating there landed on the NotFound page.
    navigate('/')
  }

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-soft-green via-cream to-soft-coral">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white bg-opacity-95 backdrop-blur-lg border-r border-white border-opacity-30 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <Link to="/" className="text-lg font-semibold">LearniLM🌍World</Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="px-4 space-y-1">
          {navigation.map(nav => (
            <Link
              key={nav.name}
              to={nav.href}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive(nav.href) ? 'bg-[#0ea5a3] text-white shadow-lg' : 'text-gray-600 hover:bg-[#0ea5a3]/10 hover:text-[#0ea5a3]'}`}
            >
              <nav.icon className="h-5 w-5" /> {nav.name}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 p-4 w-full">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 p-3 w-full bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            <LogOut className="h-5 w-5" /> Logout
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:pl-64">
        <div className="lg:hidden p-4 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-30 shadow-sm">
          <span className="font-bold text-[#0ea5a3]">LearniLM Admin</span>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-md hover:bg-gray-100">
            <Menu className="h-6 w-6 text-gray-700" />
          </button>
        </div>

        <div data-route-scroll-container className="flex-1 p-4 sm:p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<h1 className="text-2xl font-semibold">Admin Dashboard</h1>} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/employees" element={<AdminEmployees />} />
            <Route path="/trainers" element={<AdminTrainers />} />
            <Route path="/students" element={<AdminStudents />} />
            <Route path="/sessions" element={<AdminSessions />} />
            <Route path="/courses" element={<AdminCourses />} />
            <Route path="/careers" element={<AdminCareers />} />
            <Route path="/reviews" element={<AdminReviews />} />
            <Route path="/hero-tutors" element={<AdminHeroTutors />} />
          </Routes>
        </div>
        <Footer2 />
      </div>
    </div>
  )
}

export default AdminDashboard
