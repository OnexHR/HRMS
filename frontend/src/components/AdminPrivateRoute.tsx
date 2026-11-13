import React from 'react'
import { Navigate } from 'react-router-dom'
import { useEmployeeAuth } from '../contexts/EmployeeAuthContext'

// Admin-only guard for the migrated AdminEmployees screen. The donor app put
// this screen behind the website admin session; the HRMS baseline uses the
// employee-admin token instead.
const AdminPrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, loading } = useEmployeeAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="loading-dots" aria-hidden>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    )
  }

  if (role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default AdminPrivateRoute
