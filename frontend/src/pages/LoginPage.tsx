import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useEmployeeAuth } from '../contexts/EmployeeAuthContext'
import logo from '../assets/logo2.png'

type LoginMode = 'employee' | 'admin'

// Minimal HRMS sign-in screen.
//
// The donor Login.tsx was the website's global modal (Google/Facebook OAuth,
// student/trainer roles, forgot-password flows). HRMS only needs the employee
// and employee-admin credentials issued by the migrated backend, so this small
// adapter routes each successful sign-in to the correct dashboard.
const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { role, loading, employeeLogin, adminLogin } = useEmployeeAuth()

  const [mode, setMode] = useState<LoginMode>('employee')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (loading) return
    if (role === 'admin') navigate('/admin', { replace: true })
    else if (role === 'manager') navigate('/manager', { replace: true })
    else if (role === 'employee') navigate('/employee', { replace: true })
  }, [loading, role, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'admin') {
        const result = await adminLogin(email.trim(), password)
        if (!result.success) {
          setError(result.error || 'Admin sign-in failed.')
          return
        }
        navigate('/admin', { replace: true })
        return
      }

      const result = await employeeLogin(email.trim(), password)
      if (!result.success) {
        setError(result.error || 'Sign-in failed.')
        return
      }
      navigate(result.isManager ? '/manager' : '/employee', { replace: true })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F7FB] px-4 py-10 font-GoogleSansFlex">
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={logo} alt="LearnILM World" className="mb-4 h-12 w-auto object-contain" />
          <h1 className="text-2xl font-bold text-[#10284A]">HRMS Portal</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your workspace</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('employee')
              setError('')
            }}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === 'employee' ? 'bg-white text-[#10284A] shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Employee / Manager
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin')
              setError('')
            }}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === 'admin' ? 'bg-white text-[#10284A] shadow' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShieldCheck size={16} />
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-[#1143A3] focus:outline-none focus:ring-2 focus:ring-[#1143A3]/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm focus:border-[#1143A3] focus:outline-none focus:ring-2 focus:ring-[#1143A3]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1143A3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d3580] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-500">
          {mode === 'admin'
            ? 'Administrator accounts are provisioned by the HRMS seed.'
            : 'New employee accounts are created by an HR administrator.'}
        </p>
      </div>
    </main>
  )
}

export default LoginPage
