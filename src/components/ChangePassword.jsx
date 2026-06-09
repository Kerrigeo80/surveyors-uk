import { useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'

const MIN_LENGTH = 8

export default function ChangePassword() {
  const { changePassword, showToast } = useApp()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (pw.length < MIN_LENGTH) {
      showToast(`Password must be at least ${MIN_LENGTH} characters`, 'error')
      return
    }
    if (pw !== confirm) {
      showToast('Passwords do not match', 'error')
      return
    }
    setSaving(true)
    const ok = await changePassword(pw)
    setSaving(false)
    if (ok) { setPw(''); setConfirm('') }
  }

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h3 style={{ marginBottom: '6px' }}>Change Password</h3>
      <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '16px' }}>
        At least {MIN_LENGTH} characters. You'll stay signed in after updating.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving || !pw || !confirm}>
          {saving ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  )
}
