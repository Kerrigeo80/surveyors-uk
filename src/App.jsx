import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './lib/AppContext.jsx'
import Header from './components/Header.jsx'
import Toasts from './components/Toasts.jsx'
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import SurveyorDashboard from './pages/SurveyorDashboard.jsx'
import CouncilDashboard from './pages/CouncilDashboard.jsx'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Header />
        <Toasts />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/surveyor" element={<SurveyorDashboard />} />
          <Route path="/council" element={<CouncilDashboard />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
