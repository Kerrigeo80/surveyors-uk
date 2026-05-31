import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'

export default function Login() {
  const navigate = useNavigate()
  const { login, demoLogin } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const goDash = (user) => navigate(user.role === 'surveyor' ? '/surveyor' : '/council')

  const handleSubmit = (e) => {
    e.preventDefault()
    const user = login(email, password)
    if (user) goDash(user)
  }

  const handleDemo = (role) => {
    const user = demoLogin(role)
    if (user) goDash(user)
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h2>Welcome Back</h2>
        <p className="subtitle">Sign in to your Surveyors UK account</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Sign In
          </button>
        </form>
        <div className="auth-toggle">
          New here? <Link to="/register">Create an account</Link>
        </div>
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-light)', textAlign: 'center', marginBottom: '10px' }}>
            Quick demo access:
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={() => handleDemo('surveyor')}>Demo Surveyor</button>
            <button className="btn btn-outline btn-sm" onClick={() => handleDemo('council')}>Demo Council</button>
          </div>
        </div>
      </div>
    </div>
  )
}
