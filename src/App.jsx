import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './lib/AppContext.jsx'
import Header from './components/Header.jsx'
import Toasts from './components/Toasts.jsx'
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import SurveyorDashboard from './pages/SurveyorDashboard.jsx'
import CouncilDashboard from './pages/CouncilDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'

function dashFor(user) {
  if (!user) return '/'
  if (user.role === 'admin') return '/admin'
  if (user.role === 'surveyor') return '/surveyor'
  if (user.role === 'council') return '/council'
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
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/surveyor" element={<SurveyorDashboard />} />
          <Route path="/council" element={<CouncilDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
