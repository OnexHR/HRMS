import React, { createContext, useCallback, useContext } from 'react'
import { PLATFORM_TOKEN_KEY } from '../lib/employeeApi'

// Minimal HRMS adapter for the website AuthContext used by the migrated
// employee/manager sidebars. The donor app had a platform-wide session; the
// HRMS baseline only owns the employee/admin sessions, so this shim keeps the
// copied `useAuth().logout()` call sites working without pulling in the
// marketing-site auth stack.
//
// Replace with the real platform auth integration when single sign-on is added.
interface AuthState {
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export const useAuth = (): AuthState => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const logout = useCallback(() => {
    localStorage.removeItem(PLATFORM_TOKEN_KEY)
  }, [])

  return <AuthContext.Provider value={{ logout }}>{children}</AuthContext.Provider>
}

export default AuthContext
