import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import NotificationsBell from './NotificationsBell.jsx'

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
            <Link to="/beta" style={{
              color: 'white', textDecoration: 'none', fontSize: '13px',
              background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '20px',
            }}>
              🧪 Beta test
            </Link>
            <NotificationsBell />
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
