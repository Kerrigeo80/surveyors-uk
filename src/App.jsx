import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './lib/AppContext.jsx'
import Header from './components/Header.jsx'
import Toasts from './components/Toasts.jsx'
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import Legal from './pages/Legal.jsx'

// Dashboards are heavy and role-gated — split them out of the initial bundle.
const SurveyorDashboard = lazy(() => import('./pages/SurveyorDashboard.jsx'))
const CouncilDashboard = lazy(() => import('./pages/CouncilDashboard.jsx'))
const LandlordDashboard = lazy(() => import('./pages/LandlordDashboard.jsx'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'))
const BetaTest = lazy(() => import('./pages/BetaTest.jsx'))

function dashFor(user) {
  if (!user) return '/'
  if (user.role === 'admin') return '/admin'
  if (user.role === 'surveyor') return '/surveyor'
  if (user.role === 'council') return '/council'
  if (user.role === 'landlord') return '/landlord'
  return '/'
}

function PublicOnly({ children }) {
  const { currentUser, ready } = useApp()
  if (!ready) return null
  if (currentUser) return <Navigate to={dashFor(currentUser)} replace />
  return children
}

function RootRoute() {
  const { currentUser, ready } = useApp()
  if (!ready) return null
  if (currentUser) return <Navigate to={dashFor(currentUser)} replace />
  return <Landing />
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Header />
        <Toasts />
        <Suspense fallback={<div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-light)' }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Legal doc="privacy" />} />
            <Route path="/terms" element={<Legal doc="terms" />} />
            <Route path="/surveyor" element={<SurveyorDashboard />} />
            <Route path="/council" element={<CouncilDashboard />} />
            <Route path="/landlord" element={<LandlordDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/beta" element={<BetaTest />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AppProvider>
  )
}
