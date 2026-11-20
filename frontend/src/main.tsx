import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { EmployeeAuthProvider } from './contexts/EmployeeAuthContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EmployeeAuthProvider>
        <App />
      </EmployeeAuthProvider>
    </AuthProvider>
  </StrictMode>,
)
