import { useState, useEffect } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { UK_REGIONS, QUALIFICATION_TYPES, PROPERTY_TYPES, getInitials, formatDateGB, qualLabel, totalUnreadMessages } from '../lib/data.js'
import RequestCard from '../components/RequestCard.jsx'
import RequestDetailModal from '../components/RequestDetailModal.jsx'
import UploadQualificationModal from '../components/UploadQualificationModal.jsx'
import DocumentLink from '../components/DocumentLink.jsx'
import Messages from '../components/Messages.jsx'
import { RatingDisplay } from '../components/RatingStars.jsx'
import ChangePassword from '../components/ChangePassword.jsx'

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'qualifications', label: '📄 My Qualifications' },
  { id: 'requests', label: '📋 Available Requests' },
  { id: 'my-interests', label: '⭐ My Quotes' },
  { id: 'messages', label: '💬 Messages' },
  { id: 'profile', label: '⚙️ Edit Profile' },
]

export default function SurveyorDashboard() {
  const { currentUser, requests, conversations, logout } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'overview')
  const unreadMessages = totalUnreadMessages(conversations, currentUser?.id)

  // Follow ?tab= changes (e.g. clicking a message notification while already here).
  useEffect(() => {
    const t = new URLSearchParams(location.search).get('tab')
    if (t) setTab(t)
  }, [location.search])
  const [detailReq, setDetailReq] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  if (!currentUser || currentUser.role !== 'surveyor') {
    return <Navigate to="/login" replace />
  }

  const matching = requests.filter(r => {
    if (r.status !== 'open') return false
    const regionMatch = !currentUser.region || r.region === currentUser.region
    const qualMatch = !currentUser.qualifications?.length || currentUser.qualifications.includes(r.type)
    return regionMatch || qualMatch
  })
  const myInterests = requests.filter(r => r.interests.includes(currentUser.id))

  return (
    <div className="container">
      <div className="dash-grid">
        <div className="sidebar">
          <div className="card">
            <div className="sidebar-profile">
              <div className="avatar">{getInitials(currentUser.name)}</div>
              <h3>{currentUser.name}</h3>
              <p>{currentUser.email}</p>
              <span className="badge badge-surveyor" style={{ marginTop: '8px' }}>Surveyor</span>
            </div>
            <nav className="sidebar-nav">
              {TABS.map(t => (
                <a key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                  {t.label}
                  {t.id === 'messages' && unreadMessages > 0 && (
                    <span className="badge" style={{ marginLeft: '6px', background: 'var(--accent)', color: 'var(--primary)' }}>{unreadMessages}</span>
                  )}
                </a>
              ))}
              <a onClick={() => { logout(); navigate('/') }} style={{ color: 'var(--danger)' }}>🚪 Sign Out</a>
            </nav>
          </div>
        </div>

        <div className="main-content">
          {currentUser.status === 'pending' && (
            <div className="card" style={{ background: '#fefcbf', borderLeft: '4px solid #d69e2e' }}>
              <strong>⏳ Verification pending.</strong> Your account is awaiting admin review.
              You can browse and update your profile, but expressing interest is disabled
              until your qualifications are verified.
            </div>
          )}
          {currentUser.status === 'rejected' && (
            <div className="card" style={{ background: 'var(--danger-bg)', borderLeft: '4px solid var(--danger)' }}>
              <strong>Account rejected.</strong> Contact support if you think this is an error.
            </div>
          )}
          {tab === 'overview' && (
            <OverviewTab
              user={currentUser}
              matching={matching}
              myInterests={myInterests}
              onView={setDetailReq}
              onSeeAll={() => setTab('requests')}
            />
          )}
          {tab === 'qualifications' && <QualificationsTab user={currentUser} onUpload={() => setUploadOpen(true)} />}
          {tab === 'requests' && <RequestsTab onView={setDetailReq} />}
          {tab === 'my-interests' && <MyInterestsTab myInterests={myInterests} onView={setDetailReq} />}
          {tab === 'messages' && <Messages />}
          {tab === 'profile' && <ProfileTab />}
        </div>
      </div>

      {detailReq && <RequestDetailModal request={detailReq} onClose={() => setDetailReq(null)} />}
      {uploadOpen && <UploadQualificationModal onClose={() => setUploadOpen(false)} />}
    </div>
  )
}

function OverviewTab({ user, matching, myInterests, onView, onSeeAll }) {
  return (
    <>
      <h2 style={{ marginBottom: '20px' }}>Dashboard</h2>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{matching.length}</div>
          <div className="stat-label">Available Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{myInterests.length}</div>
          <div className="stat-label">My Quotes</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{(user.documents || []).length}</div>
          <div className="stat-label">Qualifications</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{user.rating != null ? user.rating.toFixed(1) : '—'}</div>
          <div className="stat-label">{user.reviewCount ? `Rating (${user.reviewCount})` : 'No reviews yet'}</div>
        </div>
      </div>
      {(user.reviews || []).length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Reviews</span>
            <RatingDisplay rating={user.rating} count={user.reviewCount} />
          </div>
          {user.reviews.slice(0, 5).map(rv => (
            <div key={rv.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <RatingDisplay rating={rv.rating} showCount={false} size={14} />
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{formatDateGB(rv.created_at)}</span>
              </div>
              {rv.comment && (
                <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '6px', lineHeight: 1.5 }}>“{rv.comment}”</p>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent Matching Requests</span>
          <button className="btn btn-outline btn-sm" onClick={onSeeAll}>View All</button>
        </div>
        {matching.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No matching requests yet</h3>
            <p>Requests matching your qualifications and region will appear here.</p>
          </div>
        ) : (
          matching.slice(0, 3).map(r => <RequestCard key={r.id} request={r} compact onView={onView} />)
        )}
      </div>
    </>
  )
}

function InsuranceCard({ user }) {
  const { submitInsurance } = useApp()
  const ins = user.insurance
  const [insurer, setInsurer] = useState(ins?.insurer || '')
  const [policyNumber, setPolicyNumber] = useState(ins?.policy_number || '')
  const [coverageAmount, setCoverageAmount] = useState(ins?.coverage_amount || '')
  const [expiryDate, setExpiryDate] = useState(ins?.expiry_date || '')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)

  const status = user.insuranceStatus || 'none'
  const statusBadge = status === 'none'
    ? <span className="badge badge-pending">not submitted</span>
    : <span className={`badge badge-${status}`}>{status}</span>

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!insurer) return
    setSaving(true)
    const ok = await submitInsurance({ insurer, policyNumber, coverageAmount, expiryDate, file })
    setSaving(false)
    if (ok) setFile(null)
  }

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <span className="card-title">🛡 Professional Indemnity Insurance</span>
        {statusBadge}
      </div>
      {ins?.expiry_date && (
        <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '12px' }}>
          Current policy expires {formatDateGB(ins.expiry_date)}.
          {ins.file_path && <> · <DocumentLink filePath={ins.file_path} label="View document" /></>}
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Insurer</label>
            <input type="text" value={insurer} onChange={e => setInsurer(e.target.value)} placeholder="e.g. Hiscox" required />
          </div>
          <div className="form-group">
            <label>Policy Number</label>
            <input type="text" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Cover Amount (£)</label>
            <input type="number" value={coverageAmount} onChange={e => setCoverageAmount(e.target.value)} placeholder="1000000" />
          </div>
          <div className="form-group">
            <label>Expiry Date</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </div>
        </div>
        <label className="upload-zone" htmlFor="insFile" style={{ display: 'block' }}>
          <div className="upload-icon">📁</div>
          <p>{file ? file.name : (ins?.file_name ? `Current: ${ins.file_name} — click to replace` : 'Click to attach your insurance certificate (PDF, JPG, PNG)')}</p>
          <input id="insFile" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0] || null)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={saving || !insurer}>
          {saving ? 'Submitting…' : (status === 'none' ? 'Submit for Verification' : 'Update & Resubmit')}
        </button>
      </form>
    </div>
  )
}

function QualificationsTab({ user, onUpload }) {
  const docs = user.documents || []
  return (
    <>
    <InsuranceCard user={user} />
    <div className="card">
      <div className="card-header">
        <span className="card-title">My Qualifications</span>
        <button className="btn btn-primary btn-sm" onClick={onUpload}>+ Upload Document</button>
      </div>
      {docs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No qualifications uploaded</h3>
          <p>Upload your certificates and qualifications to get verified.</p>
        </div>
      ) : (
        <ul className="qual-list">
          {docs.map(d => (
            <li key={d.id} className="qual-item">
              <div className="qual-info">
                <span className="qual-file-icon">📄</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{d.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    {qualLabel(d.type)} · Issued {formatDateGB(d.date, true).replace(/^\d+\s/, '')} · {d.fileName}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {d.filePath && <DocumentLink filePath={d.filePath} label="Open" />}
                <span className={`badge badge-${d.status}`}>{d.status}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
    </>
  )
}

function RequestsTab({ onView }) {
  const { requests } = useApp()
  const [search, setSearch] = useState('')
  const [qualFilter, setQualFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [propTypeFilter, setPropTypeFilter] = useState('')

  let filtered = requests.filter(r => r.status === 'open')
  if (search) filtered = filtered.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
  if (qualFilter) filtered = filtered.filter(r => r.type === qualFilter)
  if (regionFilter) filtered = filtered.filter(r => r.region === regionFilter)
  if (propTypeFilter) filtered = filtered.filter(r => r.propertyType === propTypeFilter)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Available Survey Requests</span>
      </div>
      <div className="filter-bar">
        <input type="text" placeholder="Search requests..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={qualFilter} onChange={e => setQualFilter(e.target.value)}>
          <option value="">All qualification types</option>
          {QUALIFICATION_TYPES.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
        </select>
        <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}>
          <option value="">All regions</option>
          {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={propTypeFilter} onChange={e => setPropTypeFilter(e.target.value)}>
          <option value="">All property types</option>
          {PROPERTY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No requests found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        filtered.map(r => <RequestCard key={r.id} request={r} onView={onView} />)
      )}
    </div>
  )
}

function MyInterestsTab({ myInterests, onView }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">My Quotes</span>
      </div>
      {myInterests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⭐</div>
          <h3>No quotes yet</h3>
          <p>Browse available requests and submit your first quote.</p>
        </div>
      ) : (
        myInterests.map(r => <RequestCard key={r.id} request={r} onView={onView} />)
      )}
    </div>
  )
}

function ProfileTab() {
  const { currentUser, updateCurrentUser, showToast } = useApp()
  const [name, setName] = useState(currentUser.name || '')
  const [phone, setPhone] = useState(currentUser.phone || '')
  const [rics, setRics] = useState(currentUser.rics || '')
  const [region, setRegion] = useState(currentUser.region || '')
  const [bio, setBio] = useState(currentUser.bio || '')
  const [quals, setQuals] = useState(currentUser.qualifications || [])
  const [propTypes, setPropTypes] = useState(currentUser.propertyTypes || [])

  const toggleQual = (id) => setQuals(qs => qs.includes(id) ? qs.filter(q => q !== id) : [...qs, id])
  const togglePropType = (id) => setPropTypes(ps => ps.includes(id) ? ps.filter(p => p !== id) : [...ps, id])

  const handleSubmit = (e) => {
    e.preventDefault()
    updateCurrentUser({ name, phone, rics, region, bio, qualifications: quals, propertyTypes: propTypes })
    showToast('Profile updated', 'success')
  }

  return (
    <>
    <div className="card">
      <h3 style={{ marginBottom: '20px' }}>Edit Profile</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07xxx xxxxxx" />
          </div>
        </div>
        <div className="form-group">
          <label>RICS Number</label>
          <input type="text" value={rics} onChange={e => setRics(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Service Region</label>
          <select value={region} onChange={e => setRegion(e.target.value)}>
            <option value="">Select...</option>
            {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
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
          <label>Property Types Handled</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
            {PROPERTY_TYPES.map(t => (
              <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={propTypes.includes(t.id)} onChange={() => togglePropType(t.id)} />
                {t.label}
              </label>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label>Bio / Experience Summary</label>
          <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Describe your experience and specialisations..." />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </div>
    <ChangePassword />
    </>
  )
}
