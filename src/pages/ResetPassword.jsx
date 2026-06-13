import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { supabase } from '../lib/supabase.js'

const MIN_LENGTH = 8

// Landing page for the password-reset email link. Supabase processes the
// recovery token in the URL and establishes a temporary session; the user
// then sets a new password here.
export default function ResetPassword() {
  const { changePassword, showToast } = useApp()
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // checking | ready | invalid
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let done = false
    // The recovery session may already be established by the time we mount,
    // or arrive moments later via the PASSWORD_RECOVERY event.
    supabase.auth.getSession().then(({ data }) => {
      if (done) return
      if (data.session) setStatus('ready')
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        done = true
        setStatus('ready')
      }
    })
    // If nothing has granted us a session shortly after load, the link is bad.
    const t = setTimeout(() => { if (!done) setStatus(s => (s === 'checking' ? 'invalid' : s)) }, 2500)
    return () => { sub.subscription.unsubscribe(); clearTimeout(t) }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (pw.length < MIN_LENGTH) { showToast(`Password must be at least ${MIN_LENGTH} characters`, 'error'); return }
    if (pw !== confirm) { showToast('Passwords do not match', 'error'); return }
    setSaving(true)
    const ok = await changePassword(pw)
    setSaving(false)
    if (ok) navigate('/') // session is live → RootRoute lands them on their dashboard
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h2>Choose a new password</h2>
        {status === 'checking' && (
          <p className="subtitle">Verifying your reset link…</p>
        )}
        {status === 'invalid' && (
          <>
            <p className="subtitle">This reset link is invalid or has expired.</p>
            <div className="auth-toggle"><Link to="/forgot-password">Request a new link</Link></div>
          </>
        )}
        {status === 'ready' && (
          <>
            <p className="subtitle">Enter a new password for your account. At least {MIN_LENGTH} characters.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" required />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={saving || !pw || !confirm}>
                {saving ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
