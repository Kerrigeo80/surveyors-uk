import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { UK_REGIONS, QUALIFICATION_TYPES, LANDLORD_TYPES } from '../lib/data.js'

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
  const [businessName, setBusinessName] = useState('')
  const [landlordType, setLandlordType] = useState('individual')
  const [address, setAddress] = useState('')
  const [agreed, setAgreed] = useState(false)

  // LinkedIn match-and-claim state (surveyor only)
  const [match, setMatch] = useState(null)        // matched LinkedIn profile or null
  const [claimingId, setClaimingId] = useState(null)
  const [checking, setChecking] = useState(false)
  const [checkedKey, setCheckedKey] = useState('')

  const checkLinkedIn = async () => {
    if (role !== 'surveyor') return
    setChecking(true)
    const { data, error } = await supabase.rpc('match_linkedin_profile', {
      p_email: email || '', p_name: name || '', p_rics: rics || '',
    })
    setChecking(false)
    setCheckedKey(`${email}|${name}|${rics}`)
    if (error) return
    setMatch(data?.[0] || null)
  }

  const claimMatch = () => {
    if (!match) return
    setClaimingId(match.id)
    // Prefill the form fields from the match
    if (match.rics) setRics(match.rics)
    if (match.region) setRegion(match.region)
    if (Array.isArray(match.qualifications) && match.qualifications.length) {
      setQuals(prev => Array.from(new Set([...prev, ...match.qualifications])))
    }
  }

  const toggleQual = (id) => {
    setQuals(qs => qs.includes(id) ? qs.filter(q => q !== id) : [...qs, id])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const data = { role, name, email, password }
    if (role === 'surveyor') {
      Object.assign(data, { rics, region, qualifications: quals })
    } else if (role === 'council') {
      Object.assign(data, { councilName, region, department })
    } else if (role === 'landlord') {
      Object.assign(data, { businessName, landlordType, region, address })
    }
    const ok = await register(data)
    if (ok) {
      if (claimingId) {
        // Auth state listener will land us logged in shortly; try the claim then.
        // Small retry loop to wait for the session to be ready.
        for (let i = 0; i < 10; i++) {
          const { data: sess } = await supabase.auth.getSession()
          if (sess.session) {
            await supabase.rpc('claim_linkedin_profile', { p_linkedin_id: claimingId })
            break
          }
          await new Promise(r => setTimeout(r, 250))
        }
      }
      const dash = role === 'surveyor' ? '/surveyor' : role === 'council' ? '/council' : '/landlord'
      navigate(dash)
    }
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h2>Create Account</h2>
        <p className="subtitle">Join the Surveyors UK platform</p>

        <div className="role-selector" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className={'role-option' + (role === 'surveyor' ? ' selected' : '')} onClick={() => setRole('surveyor')}>
            <div className="role-icon">📋</div>
            <div className="role-label">Surveyor</div>
            <div className="role-desc">Upload qualifications & quote on work</div>
          </div>
          <div className={'role-option' + (role === 'council' ? ' selected' : '')} onClick={() => setRole('council')}>
            <div className="role-icon">🏛</div>
            <div className="role-label">Council</div>
            <div className="role-desc">Post survey requests</div>
          </div>
          <div className={'role-option' + (role === 'landlord' ? ' selected' : '')} onClick={() => setRole('landlord')}>
            <div className="role-icon">🏠</div>
            <div className="role-label">Landlord</div>
            <div className="role-desc">Individual to housing association</div>
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

              <div style={{ marginBottom: '18px' }}>
                <button type="button" className="btn btn-outline btn-sm" disabled={checking || !(email || name || rics)}
                  onClick={checkLinkedIn}>
                  {checking ? 'Checking…' : 'Check if we already have your profile'}
                </button>
                {checkedKey && !match && !checking && (
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '8px' }}>
                    No existing profile found — keep filling in the form below.
                  </p>
                )}
                {match && (
                  <div style={{ marginTop: '10px', padding: '14px', border: '2px solid var(--primary)', borderRadius: 'var(--radius)', background: '#f0f4ff' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>We think we already have you</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)' }}>
                      <strong>{match.name}</strong>
                      {match.position_title && <> · {match.position_title}</>}
                      {match.company && <> · {match.company}</>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                      {match.region || '—'}{match.rics && <> · RICS {match.rics}</>}
                      {match.qualifications?.length > 0 && <> · {match.qualifications.length} quals</>}
                    </div>
                    {!claimingId ? (
                      <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }} onClick={claimMatch}>
                        Yes — claim & autofill
                      </button>
                    ) : (
                      <div style={{ marginTop: '10px', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                        ✓ Will be linked on signup
                      </div>
                    )}
                  </div>
                )}
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

          {role === 'landlord' && (
            <>
              <div className="form-group">
                <label>Landlord type</label>
                <select value={landlordType} onChange={e => setLandlordType(e.target.value)} required>
                  {LANDLORD_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Business / trading name (optional)</label>
                <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Riverside Properties Ltd" />
              </div>
              <div className="form-group">
                <label>Region</label>
                <select value={region} onChange={e => setRegion(e.target.value)} required>
                  <option value="">Select region...</option>
                  {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Primary address</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Main property or office address" />
              </div>
            </>
          )}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-light)', margin: '4px 0 18px' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} required style={{ marginTop: '3px' }} />
            <span>
              I agree to the <Link to="/terms" target="_blank">Terms of Service</Link> and{' '}
              <Link to="/privacy" target="_blank">Privacy Policy</Link>.
            </span>
          </label>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!agreed}>
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
