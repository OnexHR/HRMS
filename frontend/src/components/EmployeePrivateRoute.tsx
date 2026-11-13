import React from 'react'
import { Navigate } from 'react-router-dom'
import { useEmployeeAuth } from '../contexts/EmployeeAuthContext'
import type { EmployeeRole } from '../types/Employee'

interface EmployeePrivateRouteProps {
  children: React.ReactNode
  allowedRoles?: EmployeeRole[]
}

// Guards the /employee and /manager dashboards using the employee-subsystem
// session (separate token from the platform AuthContext).
const EmployeePrivateRoute: React.FC<EmployeePrivateRouteProps> = ({
  children,
  allowedRoles = [],
}) => {
  const { role, loading } = useEmployeeAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-dots" aria-hidden>
          <div></div><div></div><div></div><div></div>
        </div>
      </div>
    )
  }

  const signedOut = !role
  const wrongRole =
    role === 'admin' ||
    (role !== null && allowedRoles.length > 0 && !allowedRoles.includes(role))

  if (signedOut || wrongRole) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default EmployeePrivateRoute