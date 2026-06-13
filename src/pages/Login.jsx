import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'

export default function Login() {
  const navigate = useNavigate()
  const { login, demoLogin } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const user = await login(email, password)
    // Navigation handled by App.jsx watching session state — but push a default
    if (user) navigate('/')
  }

  const handleDemo = async (role) => {
    const user = await demoLogin(role)
    if (user) navigate('/')
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
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <Link to="/forgot-password" style={{ fontSize: '13px' }}>Forgot your password?</Link>
        </div>
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
