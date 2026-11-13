// Dedicated axios instance for the employee subsystem. Keeps the employee/admin
// JWT separate from the platform token used by AuthContext, so the two never
// collide in the shared Authorization header.

import axios from 'axios'

export const EMPLOYEE_TOKEN_KEY = 'employee_token'
export const EMPLOYEE_ADMIN_TOKEN_KEY = 'employee_admin_token'
export const PLATFORM_TOKEN_KEY = 'token'
export const SESSION_EXPIRED_EVENT = 'hrms:session-expired'

const baseURL = `${import.meta.env.VITE_API_BASE_URL}/api/employee`

export const employeeApi = axios.create({
  baseURL,
})

export function getEmployeeToken() {
  return (
    localStorage.getItem(EMPLOYEE_TOKEN_KEY) || localStorage.getItem(EMPLOYEE_ADMIN_TOKEN_KEY) || null
  )
}

export function setEmployeeSession(token: string, isManager: boolean) {
  if (isManager) {
    localStorage.setItem(EMPLOYEE_TOKEN_KEY, token)
    localStorage.removeItem(EMPLOYEE_ADMIN_TOKEN_KEY)
  } else {
    // Once chosen, keep the active token stable across refreshes.
    if (!localStorage.getItem(EMPLOYEE_TOKEN_KEY)) {
      localStorage.setItem(EMPLOYEE_TOKEN_KEY, token)
    }
  }
}

export function setEmployeeAdminSession(token: string) {
  localStorage.removeItem(EMPLOYEE_TOKEN_KEY)
  localStorage.setItem(EMPLOYEE_ADMIN_TOKEN_KEY, token)
}

export function clearEmployeeSession() {
  localStorage.removeItem(EMPLOYEE_TOKEN_KEY)
  localStorage.removeItem(EMPLOYEE_ADMIN_TOKEN_KEY)
}

employeeApi.interceptors.request.use((config) => {
  const token = getEmployeeToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

employeeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearEmployeeSession()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)

export default employeeApi

// The employee admin screens live under /admin, behind the platform admin
// session, so they authenticate with the platform token. It needs its own
// instance: sharing `employeeApi` would have the interceptor below overwrite
// the Authorization header with the employee subsystem token.
export const employeeAdminApi = axios.create({
  baseURL,
})

employeeAdminApi.interceptors.request.use((config) => {
  // HRMS baseline has no platform/website session. Admin screens authenticate
  // with the employee-admin token issued by /auth/admin-login; fall back to the
  // platform token so the donor contract still works if one is present.
  const token =
    localStorage.getItem(EMPLOYEE_ADMIN_TOKEN_KEY) || localStorage.getItem(PLATFORM_TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

employeeAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearEmployeeSession()
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
    return Promise.reject(error)
  },
)
