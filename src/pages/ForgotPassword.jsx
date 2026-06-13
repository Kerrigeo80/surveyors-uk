import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'

export default function ForgotPassword() {
  const { requestPasswordReset } = useApp()
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    const ok = await requestPasswordReset(email)
    setSending(false)
    if (ok) setSent(true)
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h2>Reset your password</h2>
        <p className="subtitle">Enter your email and we'll send you a reset link.</p>
        {sent ? (
          <div style={{ padding: '16px', borderRadius: 'var(--radius)', background: 'var(--success-bg)', marginTop: '8px' }}>
            <strong>Check your inbox.</strong>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '6px' }}>
              If <strong>{email}</strong> is registered, a password-reset link is on its way. The link expires after a short while.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={sending || !email}>
              {sending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
        <div className="auth-toggle">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
