import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { UK_REGIONS, QUALIFICATION_TYPES, getInitials, formatDateGB, qualLabel } from '../lib/data.js'
import RequestCard from '../components/RequestCard.jsx'
import RequestDetailModal from '../components/RequestDetailModal.jsx'
import UploadQualificationModal from '../components/UploadQualificationModal.jsx'

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'qualifications', label: '📄 My Qualifications' },
  { id: 'requests', label: '📋 Available Requests' },
  { id: 'my-interests', label: '⭐ My Interests' },
  { id: 'profile', label: '⚙️ Edit Profile' },
]

export default function SurveyorDashboard() {
  const { currentUser, requests, logout } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('overview')
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
                </a>
              ))}
              <a onClick={() => { logout(); navigate('/') }} style={{ color: 'var(--danger)' }}>🚪 Sign Out</a>
            </nav>
          </div>
        </div>

        <div className="main-content">
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
          <div className="stat-label">My Interests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{(user.documents || []).length}</div>
          <div className="stat-label">Qualifications</div>
        </div>
      </div>
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

function QualificationsTab({ user, onUpload }) {
  const docs = user.documents || []
  return (
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
              <span className={`badge badge-${d.status}`}>{d.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RequestsTab({ onView }) {
  const { requests } = useApp()
  const [search, setSearch] = useState('')
  const [qualFilter, setQualFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')

  let filtered = requests.filter(r => r.status === 'open')
  if (search) filtered = filtered.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
  if (qualFilter) filtered = filtered.filter(r => r.type === qualFilter)
  if (regionFilter) filtered = filtered.filter(r => r.region === regionFilter)

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
        <span className="card-title">Requests I'm Interested In</span>
      </div>
      {myInterests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⭐</div>
          <h3>No interests yet</h3>
          <p>Browse available requests and express your interest to get started.</p>
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

  const toggleQual = (id) => setQuals(qs => qs.includes(id) ? qs.filter(q => q !== id) : [...qs, id])

  const handleSubmit = (e) => {
    e.preventDefault()
    updateCurrentUser({ name, phone, rics, region, bio, qualifications: quals })
    showToast('Profile updated', 'success')
  }

  return (
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
          <label>Bio / Experience Summary</label>
          <textarea rows={4} value={bio} onChange={e => setBio(e.target.value)} placeholder="Describe your experience and specialisations..." />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </div>
  )
}
