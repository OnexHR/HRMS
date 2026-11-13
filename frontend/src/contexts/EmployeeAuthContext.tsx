import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import axios from 'axios'
import type { EmployeeUser, EmployeeRole } from '../types/Employee'
import employeeApi, {
  EMPLOYEE_TOKEN_KEY,
  EMPLOYEE_ADMIN_TOKEN_KEY,
  SESSION_EXPIRED_EVENT,
  clearEmployeeSession,
  setEmployeeAdminSession,
  employeeAdminApi,
} from '../lib/employeeApi'

export interface EmployeeAuthState {
  employee: EmployeeUser | null
  role: EmployeeRole | 'admin' | null
  isAuthenticated: boolean
  loading: boolean
  employeeLogin: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string; isManager?: boolean }>
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  refreshEmployee: () => Promise<EmployeeUser | null>
  logout: () => void
}

const EmployeeAuthContext = createContext<EmployeeAuthState | undefined>(undefined)

const getLoginError = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) && error.response?.data?.message
    ? error.response.data.message
    : fallback

// eslint-disable-next-line react-refresh/only-export-components
export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext)
  if (!context) {
    throw new Error('useEmployeeAuth must be used within an EmployeeAuthProvider')
  }
  return context
}

export const EmployeeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employee, setEmployee] = useState<EmployeeUser | null>(null)
  const [role, setRole] = useState<EmployeeRole | 'admin' | null>(null)
  const [loading, setLoading] = useState(() =>
    Boolean(
      localStorage.getItem(EMPLOYEE_ADMIN_TOKEN_KEY) ||
        localStorage.getItem(EMPLOYEE_TOKEN_KEY),
    ),
  )

  // Pulls the signed-in employee straight from the API so profile edits made on
  // another screen (or in another tab) are reflected everywhere.
  const refreshEmployee = useCallback(async () => {
    const res = await employeeApi.get('/me')
    const data = res.data?.employee
    if (data) {
      setEmployee(data)
      setRole(data.role)
    }
    return data ?? null
  }, [])

  useEffect(() => {
    const handleSessionExpired = () => {
      setEmployee(null)
      setRole(null)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)

    const token =
      localStorage.getItem(EMPLOYEE_ADMIN_TOKEN_KEY) || localStorage.getItem(EMPLOYEE_TOKEN_KEY)
    if (!token) {
      return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
    const isAdminToken = Boolean(localStorage.getItem(EMPLOYEE_ADMIN_TOKEN_KEY))
    if (isAdminToken) {
      employeeAdminApi
        .get('/auth/me')
        .then((res) => {
          if (res.data?.entity !== 'admin' || !res.data?.admin) {
            throw new Error('Invalid administrator session.')
          }
          setEmployee(null)
          setRole('admin')
        })
        .catch(() => {
          clearEmployeeSession()
          setEmployee(null)
          setRole(null)
        })
        .finally(() => setLoading(false))
      return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
    }
    Promise.resolve()
      .then(() => refreshEmployee())
      .catch(() => {
        clearEmployeeSession()
        setEmployee(null)
        setRole(null)
      })
      .finally(() => setLoading(false))
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired)
  }, [refreshEmployee])

  const employeeLogin = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await employeeApi.post('/auth/login', { email, password })
        const data = res.data
        if (data?.token) {
          // HRMS baseline keeps both realms in localStorage; a stale admin token
          // must not win over the employee session on the next page load.
          localStorage.removeItem(EMPLOYEE_ADMIN_TOKEN_KEY)
          localStorage.setItem(EMPLOYEE_TOKEN_KEY, data.token)
        }
        setEmployee(data.employee)
        setRole(data.employee?.role ?? null)
        return { success: true, isManager: Boolean(data?.isManager) }
      } catch (error: unknown) {
        return {
          success: false,
          error: getLoginError(error, 'Employee login failed'),
        }
      }
    },
    [],
  )

  const adminLogin = useCallback(async (email: string, password: string) => {
    try {
      const res = await employeeApi.post('/auth/admin-login', { email, password })
      const data = res.data
      if (data?.token) setEmployeeAdminSession(data.token)
      setEmployee(null)
      setRole('admin')
      return { success: true }
    } catch (error: unknown) {
      return {
        success: false,
        error: getLoginError(error, 'Admin login failed'),
      }
    }
  }, [])

  const logout = useCallback(() => {
    clearEmployeeSession()
    setEmployee(null)
    setRole(null)
  }, [])

  return (
    <EmployeeAuthContext.Provider
      value={{
        employee,
        role,
        isAuthenticated: Boolean(role),
        loading,
        employeeLogin,
        adminLogin,
        refreshEmployee,
        logout,
      }}
    >
      {children}
    </EmployeeAuthContext.Provider>
  )
}

export default EmployeeAuthContext