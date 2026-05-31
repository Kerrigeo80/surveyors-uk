import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { UK_REGIONS, QUALIFICATION_TYPES } from '../lib/data.js'

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { register } = useApp()
  const [role, setRole] = useState(location.state?.role || 'surveyor')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rics, setRics] = useState('')
  const [region, setRegion] = useState('')
  const [quals, setQuals] = useState([])
  const [councilName, setCouncilName] = useState('')
  const [department, setDepartment] = useState('')

  const toggleQual = (id) => {
    setQuals(qs => qs.includes(id) ? qs.filter(q => q !== id) : [...qs, id])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { role, name, email, password }
    if (role === 'surveyor') {
      Object.assign(data, { rics, region, qualifications: quals })
    } else {
      Object.assign(data, { councilName, region, department })
    }
    const ok = await register(data)
    if (ok) navigate(role === 'surveyor' ? '/surveyor' : '/council')
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h2>Create Account</h2>
        <p className="subtitle">Join the Surveyors UK platform</p>

        <div className="role-selector">
          <div className={'role-option' + (role === 'surveyor' ? ' selected' : '')} onClick={() => setRole('surveyor')}>
            <div className="role-icon">📋</div>
            <div className="role-label">Surveyor</div>
            <div className="role-desc">Register & upload qualifications</div>
          </div>
          <div className={'role-option' + (role === 'council' ? ' selected' : '')} onClick={() => setRole('council')}>
            <div className="role-icon">🏛</div>
            <div className="role-label">Local Council</div>
            <div className="role-desc">Post survey requests</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>{role === 'council' ? 'Contact Name' : 'Full Name'}</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" minLength={8} required />
          </div>

          {role === 'surveyor' && (
            <>
              <div className="form-group">
                <label>RICS Membership Number (if applicable)</label>
                <input type="text" value={rics} onChange={e => setRics(e.target.value)} placeholder="e.g. 1234567" />
              </div>
              <div className="form-group">
                <label>Qualification Types</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                  {QUALIFICATION_TYPES.map(q => (
                    <label key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={quals.includes(q.id)} onChange={() => toggleQual(q.id)} />
                      {q.label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Service Region</label>
                <select value={region} onChange={e => setRegion(e.target.value)} required>
                  <option value="">Select your region...</option>
                  {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </>
          )}

          {role === 'council' && (
            <>
              <div className="form-group">
                <label>Council Name</label>
                <input type="text" value={councilName} onChange={e => setCouncilName(e.target.value)} placeholder="e.g. Brighton & Hove City Council" />
              </div>
              <div className="form-group">
                <label>Council Region</label>
                <select value={region} onChange={e => setRegion(e.target.value)}>
                  <option value="">Select region...</option>
                  {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Department</label>
                <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Planning & Development" />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Create Account
          </button>
        </form>
        <div className="auth-toggle">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
