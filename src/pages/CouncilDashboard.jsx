import { useState, useEffect } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { UK_REGIONS, QUALIFICATION_TYPES, PROPERTY_TYPES, ORG_TYPES, HAZARD_CATEGORIES, HAZARD_SEVERITIES, getInitials, formatDateGB, qualLabel, hazardCategoryLabel, propertyTypeLabel, orgTypeLabel, toDatetimeLocal, isInsured, totalUnreadMessages } from '../lib/data.js'
import RequestDetailModal from '../components/RequestDetailModal.jsx'
import ResidentReports from '../components/ResidentReports.jsx'
import Messages from '../components/Messages.jsx'

// Map a resident report to create-request form prefill values.
function reportToPrefill(rep) {
  return {
    sourceReportId: rep.id,
    title: [rep.category ? hazardCategoryLabel(rep.category) : null, rep.address].filter(Boolean).join(' — '),
    address: rep.address || '',
    postcode: rep.postcode || '',
    description: rep.description || '',
    residentName: rep.resident_name || '',
    residentContact: rep.resident_contact || '',
    awaabsApplies: !!rep.category,
    hazardCategory: rep.category || '',
    reportedAtLocal: toDatetimeLocal(rep.reported_at),
  }
}
import { RatingDisplay } from '../components/RatingStars.jsx'
import ChangePassword from '../components/ChangePassword.jsx'

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'reports', label: '🧾 Resident Reports' },
  { id: 'my-requests', label: '📋 My Requests' },
  { id: 'create-request', label: '➕ New Request' },
  { id: 'properties', label: '🏠 My Properties' },
  { id: 'surveyors', label: '🔍 Browse Surveyors' },
  { id: 'messages', label: '💬 Messages' },
  { id: 'profile', label: '⚙️ Edit Profile' },
]

export default function CouncilDashboard() {
  const { currentUser, requests, reports, conversations, logout } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'overview')
  const [detailReq, setDetailReq] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const unreadMessages = totalUnreadMessages(conversations, currentUser?.id)
  const newReports = (reports || []).filter(r => r.status === 'new').length
  const goCreate = (pf = null) => { setPrefill(pf); setTab('create-request') }

  useEffect(() => {
    const t = new URLSearchParams(location.search).get('tab')
    if (t) setTab(t)
  }, [location.search])

  if (!currentUser || currentUser.role !== 'council') {
    return <Navigate to="/login" replace />
  }

  const myReqs = requests.filter(r => r.councilId === currentUser.id)

  return (
    <div className="container">
      <div className="dash-grid">
        <div className="sidebar">
          <div className="card">
            <div className="sidebar-profile">
              <div className="avatar" style={{ background: '#6b46c1' }}>
                {getInitials(currentUser.councilName || currentUser.name)}
              </div>
              <h3>{currentUser.councilName || currentUser.name}</h3>
              <p>{currentUser.department || orgTypeLabel(currentUser.orgType)}</p>
              <span className="badge badge-council" style={{ marginTop: '8px' }}>{orgTypeLabel(currentUser.orgType)}</span>
            </div>
            <nav className="sidebar-nav">
              {TABS.map(t => (
                <a key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
                  {t.label}
                  {t.id === 'messages' && unreadMessages > 0 && (
                    <span className="badge" style={{ marginLeft: '6px', background: 'var(--accent)', color: 'var(--primary)' }}>{unreadMessages}</span>
                  )}
                  {t.id === 'reports' && newReports > 0 && (
                    <span className="badge" style={{ marginLeft: '6px', background: 'var(--accent)', color: 'var(--primary)' }}>{newReports}</span>
                  )}
                </a>
              ))}
              <a onClick={() => { logout(); navigate('/') }} style={{ color: 'var(--danger)' }}>🚪 Sign Out</a>
            </nav>
          </div>
        </div>

        <div className="main-content">
          {tab === 'overview' && <OverviewTab myReqs={myReqs} onView={setDetailReq} onCreate={() => goCreate()} />}
          {tab === 'reports' && <ResidentReports onCreateJob={(rep) => goCreate(reportToPrefill(rep))} />}
          {tab === 'my-requests' && <MyRequestsTab myReqs={myReqs} onView={setDetailReq} onCreate={() => goCreate()} />}
          {tab === 'create-request' && <CreateRequestTab prefill={prefill} onCreated={() => { setPrefill(null); setTab('my-requests') }} />}
          {tab === 'properties' && <PropertiesTab />}
          {tab === 'surveyors' && <SurveyorsTab />}
          {tab === 'messages' && <Messages />}
          {tab === 'profile' && <ProfileTab />}
        </div>
      </div>

      {detailReq && <RequestDetailModal request={detailReq} onClose={() => setDetailReq(null)} />}
    </div>
  )
}

function CouncilRequestCard({ r, onView }) {
  const { closeRequest } = useApp()
  return (
    <div className="request-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <h4>{r.title}</h4>
        <span className={`badge badge-${r.status}`}>{r.status}</span>
      </div>
      <div className="request-meta">
        <span>📍 {r.region}</span>
        <span>📅 Due {formatDateGB(r.deadline)}</span>
        <span className="badge badge-qual">{qualLabel(r.type)}</span>
      </div>
      <div className="request-footer">
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
          {r.interests.length} surveyor{r.interests.length !== 1 ? 's' : ''} interested
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => onView?.(r)}>View Details</button>
          {r.status === 'open' && (
            <button className="btn btn-danger btn-sm" onClick={() => closeRequest(r.id)}>Close</button>
          )}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ myReqs, onView, onCreate }) {
  const openReqs = myReqs.filter(r => r.status === 'open')
  const totalInterests = myReqs.reduce((s, r) => s + r.interests.length, 0)

  return (
    <>
      <h2 style={{ marginBottom: '20px' }}>Dashboard</h2>
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{myReqs.length}</div>
          <div className="stat-label">My Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{openReqs.length}</div>
          <div className="stat-label">Open Requests</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalInterests}</div>
          <div className="stat-label">Interests Received</div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">My Recent Requests</span>
          <button className="btn btn-primary btn-sm" onClick={onCreate}>+ New Request</button>
        </div>
        {myReqs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No requests yet</h3>
            <p>Create your first survey request to get started.</p>
          </div>
        ) : (
          myReqs.slice(0, 3).map(r => <CouncilRequestCard key={r.id} r={r} onView={onView} />)
        )}
      </div>
    </>
  )
}

function MyRequestsTab({ myReqs, onView, onCreate }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">All My Requests</span>
        <button className="btn btn-primary btn-sm" onClick={onCreate}>+ New Request</button>
      </div>
      {myReqs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No requests</h3>
          <p>Create your first survey request.</p>
        </div>
      ) : (
        myReqs.map(r => <CouncilRequestCard key={r.id} r={r} onView={onView} />)
      )}
    </div>
  )
}

function CreateRequestTab({ prefill, onCreated }) {
  const { currentUser, createRequest } = useApp()
  const [form, setForm] = useState(() => ({
    title: prefill?.title || '', type: '', region: '', address: prefill?.address || '', postcode: prefill?.postcode || '',
    deadline: '', budget: '', description: prefill?.description || '', contact: '',
    propertyType: '',
    awaabsApplies: prefill?.awaabsApplies || false, hazardCategory: prefill?.hazardCategory || '', hazardSeverity: '',
    reportedAt: prefill?.reportedAtLocal || '',
    residentName: prefill?.residentName || '', residentContact: prefill?.residentContact || '',
  }))
  const sourceReportId = prefill?.sourceReportId || null
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createRequest({
      ...form,
      sourceReportId,
      reportedAt: form.awaabsApplies && form.reportedAt ? new Date(form.reportedAt).toISOString() : undefined,
    })
    onCreated()
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '20px' }}>Create New Survey Request</h3>
      {sourceReportId && (
        <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: '8px', fontSize: '13px' }}>
          Created from a resident report — details pre-filled. Set the survey type and severity, then publish.
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Request Title</label>
          <input type="text" value={form.title} onChange={set('title')} placeholder="e.g. Boundary Survey — 14 High Street" required />
        </div>

        <div className="form-group" style={{ padding: '12px', background: '#fffaf0', border: '1px solid #feebc8', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
            <input type="checkbox" checked={form.awaabsApplies}
              onChange={e => setForm(f => ({ ...f, awaabsApplies: e.target.checked }))} />
            ⚠ This is a social housing hazard (Awaab's Law applies)
          </label>
          {form.awaabsApplies && (
            <>
              <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '8px 0' }}>
                Statutory deadlines are tracked automatically from the date reported. The platform tracks
                and alerts — the landlord remains legally responsible for compliance.
              </p>
              <div className="form-row">
                <div className="form-group">
                  <label>Hazard Category</label>
                  <select value={form.hazardCategory} onChange={set('hazardCategory')} required>
                    <option value="">Select hazard...</option>
                    {HAZARD_CATEGORIES.map(h => <option key={h.id} value={h.id}>{h.label}{h.phase > 1 ? ` (Phase ${h.phase})` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Severity</label>
                  <select value={form.hazardSeverity} onChange={set('hazardSeverity')} required>
                    <option value="">Select severity...</option>
                    {HAZARD_SEVERITIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Date &amp; time reported</label>
                <input type="datetime-local" value={form.reportedAt} onChange={set('reportedAt')} />
                <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
                  Leave blank to use now. This starts the statutory clock.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Survey Type Required</label>
            <select value={form.type} onChange={set('type')} required>
              <option value="">Select type...</option>
              {QUALIFICATION_TYPES.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Region</label>
            <select value={form.region} onChange={set('region')} required>
              <option value="">Select region...</option>
              {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Property Type (optional)</label>
          <select value={form.propertyType} onChange={set('propertyType')}>
            <option value="">Not specified</option>
            {PROPERTY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Site Address</label>
            <input type="text" value={form.address} onChange={set('address')} placeholder="Full site address" required />
          </div>
          <div className="form-group">
            <label>Postcode</label>
            <input type="text" value={form.postcode} onChange={set('postcode')} placeholder="e.g. BN2 1TL" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Deadline</label>
            <input type="date" value={form.deadline} onChange={set('deadline')} required />
          </div>
          <div className="form-group">
            <label>Estimated Budget (optional)</label>
            <input type="text" value={form.budget} onChange={set('budget')} placeholder="e.g. £2,000 - £5,000" />
          </div>
        </div>
        <div className="form-group">
          <label>Description & Requirements</label>
          <textarea rows={5} value={form.description} onChange={set('description')} placeholder="Describe what the survey should cover, any special requirements, access details, etc." required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Resident Name (optional)</label>
            <input type="text" value={form.residentName} onChange={set('residentName')} placeholder="Who reported it" />
          </div>
          <div className="form-group">
            <label>Resident Contact (optional)</label>
            <input type="text" value={form.residentContact} onChange={set('residentContact')} placeholder="Phone or email" />
          </div>
        </div>
        <div className="form-group">
          <label>Contact Email</label>
          <input type="email" value={form.contact} onChange={set('contact')} placeholder="procurement@council.gov.uk" required />
        </div>
        <button type="submit" className="btn btn-primary">Publish Request</button>
      </form>
    </div>
  )
}

function SurveyorsTab() {
  const { users } = useApp()
  const [search, setSearch] = useState('')
  const [qualFilter, setQualFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [propTypeFilter, setPropTypeFilter] = useState('')

  let surveyors = users.filter(u => u.role === 'surveyor')
  if (search) surveyors = surveyors.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || (s.bio || '').toLowerCase().includes(search.toLowerCase()))
  if (qualFilter) surveyors = surveyors.filter(s => s.qualifications?.includes(qualFilter))
  if (regionFilter) surveyors = surveyors.filter(s => s.region === regionFilter)
  if (propTypeFilter) surveyors = surveyors.filter(s => s.propertyTypes?.includes(propTypeFilter))

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Registered Surveyors</span>
      </div>
      <div className="filter-bar">
        <input type="text" placeholder="Search surveyors..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={qualFilter} onChange={e => setQualFilter(e.target.value)}>
          <option value="">All qualifications</option>
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
      {surveyors.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No surveyors found</h3>
          <p>Try adjusting your filters.</p>
        </div>
      ) : (
        surveyors.map(s => <SurveyorCard key={s.id} s={s} />)
      )}
    </div>
  )
}

function SurveyorCard({ s }) {
  const qualLabels = (s.qualifications || []).map(qualLabel)
  const docs = s.documents || []
  const verifiedCount = docs.filter(d => d.status === 'verified').length

  return (
    <div className="request-card">
      <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
          {getInitials(s.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <h4>{s.name}</h4>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {verifiedCount > 0
                ? <span className="badge badge-verified">Verified</span>
                : <span className="badge badge-pending">Pending</span>}
              {isInsured(s) && <span className="badge badge-verified">🛡 Insured</span>}
            </div>
          </div>
          <div style={{ margin: '6px 0' }}>
            <RatingDisplay rating={s.rating} count={s.reviewCount} />
          </div>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>📍 {s.region || 'Not specified'}</span>
            {s.rics && <span>RICS: {s.rics}</span>}
            <span>📄 {docs.length} document{docs.length !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ margin: '8px 0' }}>
            {qualLabels.map((q, i) => <span key={i} className="badge badge-qual">{q}</span>)}
          </div>
          {(s.propertyTypes || []).length > 0 && (
            <div className="request-meta" style={{ margin: '6px 0' }}>
              <span>🏠 {s.propertyTypes.map(propertyTypeLabel).join(', ')}</span>
            </div>
          )}
          {s.bio && (
            <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '8px', lineHeight: 1.5 }}>
              {s.bio.length > 150 ? s.bio.substring(0, 150) + '...' : s.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function PropertiesTab() {
  const { currentUser, properties, createProperty, deleteProperty } = useApp()
  const myProperties = properties.filter(p => p.landlord_id === currentUser.id)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ address: '', postcode: '', region: currentUser.region || '', type: 'residential', units: '', notes: '' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    await createProperty(form)
    setForm({ address: '', postcode: '', region: currentUser.region || '', type: 'residential', units: '', notes: '' })
    setShowAdd(false)
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">My Properties ({myProperties.length})</span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(s => !s)}>
          {showAdd ? 'Cancel' : '+ Add Property'}
        </button>
      </div>
      {showAdd && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg)', padding: '16px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
          <div className="form-group">
            <label>Address</label>
            <input type="text" value={form.address} onChange={set('address')} placeholder="Full address" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Postcode</label>
              <input type="text" value={form.postcode} onChange={set('postcode')} placeholder="e.g. BN2 1TL" />
            </div>
            <div className="form-group">
              <label>Region</label>
              <select value={form.region} onChange={set('region')}>
                <option value="">Select...</option>
                {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Property type</label>
              <select value={form.type} onChange={set('type')}>
                {PROPERTY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Units (if multi-unit)</label>
              <input type="number" min="1" value={form.units} onChange={set('units')} placeholder="e.g. 12" />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea rows={2} value={form.notes} onChange={set('notes')} placeholder="Access details, special notes" />
          </div>
          <button type="submit" className="btn btn-primary">Save Property</button>
        </form>
      )}
      {myProperties.length === 0 && !showAdd ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <h3>No properties yet</h3>
          <p>Add the properties you manage to attach them to survey requests.</p>
        </div>
      ) : (
        <ul className="qual-list">
          {myProperties.map(p => (
            <li key={p.id} className="qual-item">
              <div className="qual-info">
                <span className="qual-file-icon">🏠</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.address}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    {[p.postcode, p.region, PROPERTY_TYPES.find(t => t.id === p.type)?.label, p.units && `${p.units} units`].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => deleteProperty(p.id)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProfileTab() {
  const { currentUser, updateCurrentUser, showToast } = useApp()
  const [orgType, setOrgType] = useState(currentUser.orgType || 'council')
  const [councilName, setCouncilName] = useState(currentUser.councilName || '')
  const [department, setDepartment] = useState(currentUser.department || '')
  const [region, setRegion] = useState(currentUser.region || '')
  const [address, setAddress] = useState(currentUser.address || '')
  const [phone, setPhone] = useState(currentUser.phone || '')
  const [about, setAbout] = useState(currentUser.about || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    updateCurrentUser({ orgType, councilName, department, region, address, phone, about })
    showToast('Profile updated', 'success')
  }

  return (
    <>
    <div className="card">
      <h3 style={{ marginBottom: '20px' }}>Edit Organisation Profile</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Organisation type</label>
            <select value={orgType} onChange={e => setOrgType(e.target.value)}>
              {ORG_TYPES.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Organisation name</label>
            <input type="text" value={councilName} onChange={e => setCouncilName(e.target.value)} />
          </div>
        </div>
        <div className="form-row">
          {orgType === 'council' && (
            <div className="form-group">
              <label>Department</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label>Region</label>
            <select value={region} onChange={e => setRegion(e.target.value)}>
              <option value="">Select...</option>
              {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Address</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Organisation address" />
        </div>
        <div className="form-group">
          <label>Contact Phone</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="01234 567890" />
        </div>
        <div className="form-group">
          <label>About</label>
          <textarea rows={4} value={about} onChange={e => setAbout(e.target.value)} placeholder="About your organisation and typical survey needs..." />
        </div>
        <button type="submit" className="btn btn-primary">Save Changes</button>
      </form>
    </div>
    <ChangePassword />
    </>
  )
}
