import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'

export default function Header() {
  const { currentUser, logout } = useApp()
  const navigate = useNavigate()

  return (
    <div className="header">
      <Link to="/" className="logo" style={{ color: 'white', textDecoration: 'none' }}>
        <div className="logo-icon">📐</div>
        <span>Surveyors UK</span>
      </Link>
      <div className="header-actions">
        {currentUser ? (
          <>
            <div className="user-badge">
              {currentUser.role === 'council' ? '🏛' : currentUser.role === 'landlord' ? '🏠' : currentUser.role === 'admin' ? '⭐' : '📋'} {currentUser.name}
            </div>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              onClick={() => { logout(); navigate('/') }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
              Get Started
            </button>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </>
        )}
      </div>
    </div>
  )
}
