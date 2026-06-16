import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { getInitials, formatDateGB, qualLabel, feeBandPiMin, feeBandLabel, entityTypeLabel, orgTypeLabel, formatGBP, isMatch, matchReasons, verificationChecklist, UK_REGIONS, QUALIFICATION_TYPES, AVAILABILITY_OPTIONS, FEE_BANDS } from '../lib/data.js'
import LinkedInImport from '../components/LinkedInImport.jsx'
import DocumentLink from '../components/DocumentLink.jsx'
import ChangePassword from '../components/ChangePassword.jsx'

const TABS = [
  { id: 'pending', label: '⏳ Pending Surveyors' },
  { id: 'match', label: '🔎 Match Surveyors' },
  { id: 'followup', label: '📣 Follow-up' },
  { id: 'surveyors', label: '📋 All Surveyors' },
  { id: 'councils', label: '🏛 Organisations' },
  { id: 'requests', label: '📑 All Requests' },
  { id: 'documents', label: '📄 Document Review' },
  { id: 'entities', label: '🏢 Entities' },
  { id: 'insurance', label: '🛡 Insurance' },
  { id: 'linkedin', label: '📥 LinkedIn Pool' },
  { id: 'feedback', label: '💬 Beta Feedback' },
  { id: 'billing', label: '💷 Billing' },
  { id: 'account', label: '🔑 Account' },
]

export default function AdminDashboard() {
  const { currentUser, users, requests, logout, setSurveyorStatus } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('pending')
  const [allProfiles, setAllProfiles] = useState(null)
  const [allDocuments, setAllDocuments] = useState(null)
  const [insurancePolicies, setInsurancePolicies] = useState(null)
  const [linkedinProfiles, setLinkedinProfiles] = useState(null)
  const [feedbackItems, setFeedbackItems] = useState(null)

  if (!currentUser || currentUser.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  // Admin-only direct loads (RLS lets admins see everything)
  const loadProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setAllProfiles(data || [])
  }
  const loadDocuments = async () => {
    const { data } = await supabase
      .from('credential_documents')
      .select('*, profiles!credential_documents_surveyor_id_fkey(name, email)')
      .order('created_at', { ascending: false })
    setAllDocuments(data || [])
  }
  const loadLinkedin = async () => {
    const { data } = await supabase
      .from('linkedin_profiles')
      .select('*, claimer:profiles!linkedin_profiles_claimed_by_fkey(name, email)')
      .order('imported_at', { ascending: false })
    setLinkedinProfiles(data || [])
  }

  const loadInsurance = async () => {
    const { data } = await supabase
      .from('insurance_policies')
      .select('*, profiles!insurance_policies_surveyor_id_fkey(name, email)')
      .order('created_at', { ascending: false })
    setInsurancePolicies(data || [])
  }

  if (allProfiles === null) loadProfiles()
  if (allDocuments === null) loadDocuments()
  if (insurancePolicies === null) loadInsurance()
  if (linkedinProfiles === null) loadLinkedin()
  const loadFeedback = async () => {
    const { data } = await supabase
      .from('feedback')
      .select('*, profiles!feedback_user_id_fkey(name, email)')
      .order('created_at', { ascending: false })
    setFeedbackItems(data || [])
  }
  if (feedbackItems === null) loadFeedback()

  const pendingSurveyors = (allProfiles || []).filter(p => p.role === 'surveyor' && p.status === 'pending')
  const allSurveyors = users.filter(u => u.role === 'surveyor')
  const allCouncils = users.filter(u => u.role === 'council')
  const survById = new Map(allSurveyors.map(s => [s.id, s]))
  const entitySubmitted = allSurveyors.filter(s => s.entityType)

  return (
    <div className="container">
      <div className="dash-grid">
        <div className="sidebar">
          <div className="card">
            <div className="sidebar-profile">
              <div className="avatar" style={{ background: '#e8a838', color: '#1e3a5f' }}>
                {getInitials(currentUser.name)}
              </div>
              <h3>{currentUser.name}</h3>
              <p>{currentUser.email}</p>
              <span className="badge" style={{ marginTop: '8px', background: '#fef3c7', color: '#92400e' }}>Admin</span>
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
          {tab === 'pending' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Pending Surveyors ({pendingSurveyors.length})</span>
                <button className="btn btn-outline btn-sm" onClick={loadProfiles}>Refresh</button>
              </div>
              {pendingSurveyors.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3>No pending surveyors</h3>
                  <p>All registrations are reviewed.</p>
                </div>
              ) : (
                pendingSurveyors.map(p => (
                  <PendingRow
                    key={p.id} p={p}
                    onApprove={async () => { await setSurveyorStatus(p.id, 'active'); await loadProfiles() }}
                    onReject={async () => { await setSurveyorStatus(p.id, 'rejected'); await loadProfiles() }}
                  />
                ))
              )}
            </div>
          )}

          {tab === 'match' && <MatchTab surveyors={allSurveyors} requests={requests} />}

          {tab === 'followup' && <FollowUpTab surveyors={allSurveyors} />}

          {tab === 'surveyors' && (
            <div className="card">
              <div className="card-header"><span className="card-title">All Surveyors ({allSurveyors.length})</span></div>
              {allSurveyors.length === 0 ? <Empty icon="🔍" title="No surveyors" />
                : allSurveyors.map(s => <PersonRow key={s.id} p={s} />)}
            </div>
          )}

          {tab === 'councils' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Organisations ({allCouncils.length})</span></div>
              {allCouncils.length === 0 ? <Empty icon="🏛" title="No organisations" />
                : allCouncils.map(c => <CouncilRow key={c.id} c={c} />)}
            </div>
          )}

          {tab === 'requests' && (
            <div className="card">
              <div className="card-header"><span className="card-title">All Survey Requests ({requests.length})</span></div>
              {requests.length === 0 ? <Empty icon="📑" title="No requests" />
                : requests.map(r => (
                  <div key={r.id} className="request-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <h4>{r.title}</h4>
                      <span className={`badge badge-${r.status}`}>{r.status}</span>
                    </div>
                    <div className="request-meta">
                      <span>📍 {r.region}</span>
                      <span>📅 Due {formatDateGB(r.deadline)}</span>
                      <span className="badge badge-qual">{qualLabel(r.type)}</span>
                      <span>⭐ {r.interests.length} interest{r.interests.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {tab === 'linkedin' && (
            <>
              <LinkedInImport onImported={loadLinkedin} />
              <div className="card">
                <div className="card-header">
                  <span className="card-title">LinkedIn pool ({linkedinProfiles?.length || 0})</span>
                  <button className="btn btn-outline btn-sm" onClick={loadLinkedin}>Refresh</button>
                </div>
                {!linkedinProfiles?.length
                  ? <Empty icon="📥" title="No LinkedIn profiles imported yet" />
                  : <LinkedInList profiles={linkedinProfiles} />}
              </div>
            </>
          )}

          {tab === 'feedback' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Beta feedback ({feedbackItems?.length || 0})</span>
                <button className="btn btn-outline btn-sm" onClick={loadFeedback}>Refresh</button>
              </div>
              {!feedbackItems?.length
                ? <Empty icon="💬" title="No feedback yet" />
                : feedbackItems.map(f => <FeedbackRow key={f.id} f={f} />)}
            </div>
          )}

          {tab === 'documents' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Credential Documents ({allDocuments?.length || 0})</span>
                <button className="btn btn-outline btn-sm" onClick={loadDocuments}>Refresh</button>
              </div>
              {!allDocuments?.length ? <Empty icon="📄" title="No documents uploaded" />
                : allDocuments.map(d => <DocumentRow key={d.id} d={d} onChanged={loadDocuments} />)}
            </div>
          )}

          {tab === 'entities' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Business entities ({entitySubmitted.length})</span>
              </div>
              {entitySubmitted.length === 0 ? <Empty icon="🏢" title="No entity details submitted yet" />
                : entitySubmitted.map(s => <EntityRow key={s.id} s={s} />)}
            </div>
          )}

          {tab === 'insurance' && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Insurance ({insurancePolicies?.length || 0})</span>
                <button className="btn btn-outline btn-sm" onClick={loadInsurance}>Refresh</button>
              </div>
              {!insurancePolicies?.length ? <Empty icon="🛡" title="No insurance submitted yet" />
                : insurancePolicies.map(p => <InsuranceRow key={p.surveyor_id} p={p} feeBand={survById.get(p.surveyor_id)?.feeBand} onChanged={loadInsurance} />)}
            </div>
          )}

          {tab === 'billing' && <BillingAdminTab />}
          {tab === 'account' && <ChangePassword />}
        </div>
      </div>
    </div>
  )
}

function PendingRow({ p, onApprove, onReject }) {
  return (
    <div className="request-card">
      <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
          {getInitials(p.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <h4>{p.name}</h4>
            <span className="badge badge-pending">pending</span>
          </div>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>✉️ {p.email}</span>
            <span>📅 Signed up {formatDateGB(p.created_at)}</span>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary btn-sm" onClick={onApprove}>Approve</button>
            <button className="btn btn-danger btn-sm" onClick={onReject}>Reject</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PersonRow({ p }) {
  return (
    <div className="request-card">
      <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
          {getInitials(p.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <h4>{p.name}</h4>
            <span className="badge badge-verified">verified</span>
          </div>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>✉️ {p.email}</span>
            <span>📍 {p.region || '—'}</span>
            {p.rics && <span>RICS {p.rics}</span>}
          </div>
          <div style={{ margin: '6px 0' }}>
            {(p.qualifications || []).map(q => <span key={q} className="badge badge-qual">{qualLabel(q)}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
}

function CouncilRow({ c }) {
  return (
    <div className="request-card">
      <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#6b46c1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
          {getInitials(c.councilName || c.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <h4>{c.councilName || c.name}</h4>
            <span className="badge badge-qual">{orgTypeLabel(c.orgType)}</span>
          </div>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>👤 {c.name}</span>
            <span>✉️ {c.email}</span>
            <span>📍 {c.region || '—'}</span>
            {c.department && <span>{c.department}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentRow({ d, onChanged }) {
  const { setDocumentStatus } = useApp()
  const owner = d.profiles
  return (
    <div className="request-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h4>{d.title}</h4>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>{owner?.name || '—'}</span>
            <span>{owner?.email || '—'}</span>
            <span>{qualLabel(d.type)}</span>
            {d.issue_date && <span>Issued {formatDateGB(d.issue_date)}</span>}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
            {d.file_name || '—'}{' '}
            {d.file_path && <DocumentLink filePath={d.file_path} label="(open)" />}
          </div>
        </div>
        <span className={`badge badge-${d.status}`}>{d.status}</span>
      </div>
      {d.status === 'pending' && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary btn-sm" onClick={async () => { await setDocumentStatus(d.id, 'verified'); onChanged() }}>Verify</button>
          <button className="btn btn-danger btn-sm" onClick={async () => { await setDocumentStatus(d.id, 'rejected'); onChanged() }}>Reject</button>
        </div>
      )}
    </div>
  )
}

function MatchTab({ surveyors, requests }) {
  const openJobs = requests.filter(r => r.status === 'open')
  const [jobId, setJobId] = useState('')
  const [search, setSearch] = useState('')
  const [qual, setQual] = useState('')
  const [region, setRegion] = useState('')
  const [coverage, setCoverage] = useState('')
  const [availability, setAvailability] = useState('')
  const [feeBand, setFeeBand] = useState('')
  const [readyOnly, setReadyOnly] = useState(false)

  const job = openJobs.find(j => j.id === jobId) || null
  const effectiveQual = qual || (job ? job.type : '')

  let list = surveyors.slice()
  if (search) {
    const q = search.toLowerCase()
    list = list.filter(s => (s.name || '').toLowerCase().includes(q) || (s.tradingName || '').toLowerCase().includes(q))
  }
  if (effectiveQual) list = list.filter(s => (s.qualifications || []).includes(effectiveQual))
  if (region) list = list.filter(s => s.region === region)
  if (coverage) {
    const c = coverage.trim().toUpperCase()
    list = list.filter(s => (s.coverageAreas || []).some(a => a.toUpperCase().startsWith(c)) || (s.region || '').toUpperCase().includes(c))
  }
  if (availability) list = list.filter(s => (s.availabilityStatus || 'available') === availability)
  if (feeBand) list = list.filter(s => (s.feeBand || 'under_100k') === feeBand)
  if (readyOnly) list = list.filter(s => s.workReady)

  list.sort((a, b) => {
    if (job) { const m = (isMatch(job, b) ? 1 : 0) - (isMatch(job, a) ? 1 : 0); if (m) return m }
    return (b.workReady ? 1 : 0) - (a.workReady ? 1 : 0)
  })

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Match surveyors to a job</span></div>
      <div className="form-group">
        <label>Match against an open job (optional)</label>
        <select value={jobId} onChange={e => setJobId(e.target.value)}>
          <option value="">— Free search (no job) —</option>
          {openJobs.map(j => <option key={j.id} value={j.id}>{j.title} · {qualLabel(j.type)} · {j.region}</option>)}
        </select>
      </div>
      {job && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '8px', fontSize: '13px' }}>
          Showing surveyors for <strong>{qualLabel(job.type)}</strong> in <strong>{job.region}</strong>
          {job.postcode ? ` (${job.postcode})` : ''}. Best matches first — qualification is filtered to the job.
        </div>
      )}
      <div className="filter-bar">
        <input type="text" placeholder="Search name…" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={qual} onChange={e => setQual(e.target.value)}>
          <option value="">{job ? `Qual: ${qualLabel(job.type)} (job)` : 'All qualifications'}</option>
          {QUALIFICATION_TYPES.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
        </select>
        <select value={region} onChange={e => setRegion(e.target.value)}>
          <option value="">All regions</option>
          {UK_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input type="text" placeholder="Coverage e.g. BN" value={coverage} onChange={e => setCoverage(e.target.value)} />
        <select value={availability} onChange={e => setAvailability(e.target.value)}>
          <option value="">Any availability</option>
          {AVAILABILITY_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <select value={feeBand} onChange={e => setFeeBand(e.target.value)}>
          <option value="">Any fee band</option>
          {FEE_BANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <input type="checkbox" checked={readyOnly} onChange={e => setReadyOnly(e.target.checked)} /> Verified only
        </label>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '0 0 8px' }}>{list.length} surveyor{list.length !== 1 ? 's' : ''}</p>
      {list.length === 0 ? <Empty icon="🔍" title="No surveyors match" />
        : list.map(s => <MatchResultRow key={s.id} s={s} job={job} />)}
    </div>
  )
}

function shareJobMailto(s, job) {
  const subject = job ? `Survey opportunity: ${job.title}` : 'Survey opportunity via Surveyors UK'
  const lines = [`Hi ${s.name || ''},`, '']
  if (job) {
    lines.push('A job has come up that fits your profile:', '',
      `• ${job.title}`, `• Type: ${qualLabel(job.type)}`,
      `• Region: ${job.region}${job.postcode ? ' (' + job.postcode + ')' : ''}`)
    if (job.deadline) lines.push(`• Deadline: ${formatDateGB(job.deadline)}`)
    if (job.budget) lines.push(`• Budget: ${job.budget}`)
    lines.push('', 'Log in to view and submit a quote.', '', 'Thanks')
  } else {
    lines.push('Get in touch about upcoming survey work.', '', 'Thanks')
  }
  return `mailto:${s.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}

function MatchResultRow({ s, job }) {
  const reasons = job ? matchReasons(job, s) : []
  const matches = job ? isMatch(job, s) : false
  const avail = (AVAILABILITY_OPTIONS.find(a => a.id === (s.availabilityStatus || 'available')) || {}).label
  return (
    <div className="request-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0 }}>{s.name}</h4>
            {s.tradingName && <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{s.tradingName}</span>}
            {s.workReady
              ? <span className="badge badge-verified">verified</span>
              : <span className="badge badge-pending">unverified</span>}
            {job && (matches
              ? <span className="badge badge-verified">✓ matches job</span>
              : <span className="badge badge-closed">outside criteria</span>)}
          </div>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>📍 {s.region || '—'}</span>
            {(s.coverageAreas || []).length > 0 && <span>🗺 {s.coverageAreas.join(', ')}</span>}
            {avail && <span>{avail}</span>}
            <span>Fee band {feeBandLabel(s.feeBand)}</span>
            {s.acceptsEmergency && <span className="badge badge-qual">24h emergencies</span>}
          </div>
          <div style={{ margin: '6px 0' }}>
            {(s.qualifications || []).map(q => <span key={q} className="badge badge-qual">{qualLabel(q)}</span>)}
          </div>
          {reasons.length > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--success)' }}>Why: {reasons.join(' · ')}</div>
          )}
          {!s.workReady && (
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
              Insurance: {s.insuranceStatus || 'none'} · Entity: {s.entityStatus || 'pending'}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
          <a className="btn btn-outline btn-sm" href={`mailto:${s.email || ''}`}>✉️ Email</a>
          {job && <a className="btn btn-primary btn-sm" href={shareJobMailto(s, job)}>Share job</a>}
        </div>
      </div>
    </div>
  )
}

function followUpMailto(s, missing) {
  const subject = 'Finish your Surveyors UK verification'
  const lines = [`Hi ${s.name || ''},`, '', "You're almost set up. Before you can take on work, we still need:", '']
  missing.forEach(m => lines.push(`• ${m.label} — ${m.detail}`))
  lines.push('', 'Log in and head to the Verification tab to complete these.', '', 'Thanks')
  return `mailto:${s.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
}

function FollowUpTab({ surveyors }) {
  const unverified = surveyors.filter(s => !s.workReady)
  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Surveyors to follow up ({unverified.length})</span></div>
      <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '0 0 12px' }}>
        These surveyors can't take on work yet. Here's exactly what each still needs — nudge them to finish.
      </p>
      {unverified.length === 0 ? <Empty icon="✅" title="Everyone's verified" />
        : unverified.map(s => <UnverifiedRow key={s.id} s={s} />)}
    </div>
  )
}

function UnverifiedRow({ s }) {
  const steps = verificationChecklist(s)
  const missing = steps.filter(x => !x.done)
  return (
    <div className="request-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0 }}>{s.name} <span style={{ fontSize: '12px', color: 'var(--text-light)', fontWeight: 400 }}>{s.email}</span></h4>
          <ul className="qual-list" style={{ marginTop: '8px' }}>
            {steps.map(x => (
              <li key={x.key} className="qual-item" style={{ padding: '6px 0' }}>
                <div className="qual-info">
                  <span>{x.done ? '✅' : '⬜'}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{x.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{x.detail}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <a className="btn btn-primary btn-sm" href={followUpMailto(s, missing)} style={{ flexShrink: 0 }}>✉️ Email what's needed</a>
      </div>
    </div>
  )
}

function EntityRow({ s }) {
  const { setEntityStatus } = useApp()
  const chUrl = s.companyNumber
    ? `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(s.companyNumber)}`
    : null
  return (
    <div className="request-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h4>{s.tradingName || s.name}</h4>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>{s.name}</span>
            <span>{s.email}</span>
            <span className="badge badge-qual">{entityTypeLabel(s.entityType)}</span>
            {s.companyNumber && <span>Co. No. {s.companyNumber}</span>}
            <span>Fee band {feeBandLabel(s.feeBand)} → PI min {formatGBP(feeBandPiMin(s.feeBand))}</span>
            {s.workReady && <span className="badge badge-verified">work-ready</span>}
          </div>
          {chUrl && (
            <div style={{ fontSize: '13px' }}>
              <a href={chUrl} target="_blank" rel="noreferrer">Check on Companies House ↗</a>
            </div>
          )}
        </div>
        <span className={`badge badge-${s.entityStatus}`}>{s.entityStatus}</span>
      </div>
      {s.entityStatus !== 'verified' ? (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setEntityStatus(s.id, 'verified')}>Verify entity</button>
          <button className="btn btn-danger btn-sm" onClick={() => setEntityStatus(s.id, 'rejected')}>Reject</button>
        </div>
      ) : (
        <div style={{ marginTop: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setEntityStatus(s.id, 'pending')}>Unverify</button>
        </div>
      )}
    </div>
  )
}

function InsuranceRow({ p, feeBand, onChanged }) {
  const { setInsuranceStatus } = useApp()
  const owner = p.profiles
  const required = feeBandPiMin(feeBand)
  const cover = Number(p.coverage_amount || 0)
  const belowMin = cover > 0 && cover < required
  return (
    <div className="request-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h4>{p.insurer}</h4>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>{owner?.name || '—'}</span>
            <span>{owner?.email || '—'}</span>
            {p.policy_number && <span>Policy {p.policy_number}</span>}
            {p.coverage_amount && <span>{formatGBP(p.coverage_amount)} cover</span>}
            <span>Required: {formatGBP(required)}</span>
            {p.expiry_date && <span>Expires {formatDateGB(p.expiry_date)}</span>}
          </div>
          {belowMin && (
            <div style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 600 }}>
              ⚠ Cover is below the {formatGBP(required)} minimum for this surveyor's fee band.
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>
            {p.file_name || '—'}{' '}
            {p.file_path && <DocumentLink filePath={p.file_path} label="(open)" />}
          </div>
        </div>
        <span className={`badge badge-${p.status}`}>{p.status}</span>
      </div>
      {p.status === 'pending' && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary btn-sm" onClick={async () => { await setInsuranceStatus(p.surveyor_id, 'verified'); onChanged() }}>Verify</button>
          <button className="btn btn-danger btn-sm" onClick={async () => { await setInsuranceStatus(p.surveyor_id, 'rejected'); onChanged() }}>Reject</button>
        </div>
      )}
    </div>
  )
}

function LinkedInList({ profiles }) {
  const { showToast } = useApp()
  const copyInvite = (id) => {
    const url = `${window.location.origin}/register?invite=${id}`
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => showToast('Invite link copied', 'success'), () => window.prompt('Copy this invite link:', url))
    } else {
      window.prompt('Copy this invite link:', url)
    }
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>RICS</th><th>Region</th><th>Quals</th><th>Status</th><th>Invite</th>
        </tr>
      </thead>
      <tbody>
        {profiles.map(p => (
          <tr key={p.id}>
            <td>{p.name}</td>
            <td>{p.email || '—'}</td>
            <td>{p.rics || '—'}</td>
            <td>{p.region || '—'}</td>
            <td style={{ fontSize: '12px' }}>{(p.qualifications || []).join(', ') || '—'}</td>
            <td>
              {p.claimed_by
                ? <span className="badge badge-verified">claimed · {p.claimer?.name || '—'}</span>
                : <span className="badge badge-pending">unclaimed</span>}
            </td>
            <td>
              {p.claimed_by
                ? '—'
                : <button className="btn btn-outline btn-sm" onClick={() => copyInvite(p.id)}>Copy link</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function FeedbackRow({ f }) {
  return (
    <div className="request-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h4>{f.scenario}</h4>
          <div className="request-meta" style={{ margin: '6px 0' }}>
            <span>{f.profiles?.name || f.user_id}</span>
            <span>{f.profiles?.email || ''}</span>
            <span className="badge badge-qual">{f.role}</span>
            {f.works_well === true && <span className="badge badge-verified">👍 works</span>}
            {f.works_well === false && <span className="badge badge-closed">👎 broken</span>}
            {f.rating && <span>Rating: {f.rating}/5</span>}
            <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>{formatDateGB(f.created_at)}</span>
          </div>
          {f.comment && (
            <p style={{ fontSize: '14px', color: 'var(--text)', marginTop: '8px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{f.comment}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function BillingAdminTab() {
  const { settings, jobCharges, updatePlatformSettings } = useApp()
  const [rate, setRate] = useState(settings ? String(Math.round((settings.commission_rate || 0) * 1000) / 10) : '10')
  const [survPrice, setSurvPrice] = useState(settings?.surveyor_plan_price ?? '')
  const [orgPrice, setOrgPrice] = useState(settings?.org_plan_price ?? '')
  const [saving, setSaving] = useState(false)

  const totalCommission = jobCharges.reduce((s, c) => s + Number(c.commissionAmount || 0), 0)
  const totalGmv = jobCharges.reduce((s, c) => s + Number(c.surveyorFee || 0), 0)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    await updatePlatformSettings({
      commissionRate: rate === '' ? undefined : Number(rate) / 100,
      surveyorPlanPrice: survPrice === '' ? '' : Number(survPrice),
      orgPlanPrice: orgPrice === '' ? '' : Number(orgPrice),
    })
    setSaving(false)
  }

  return (
    <>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header"><span className="card-title">Revenue</span></div>
        <div className="stats-row">
          <div className="stat-card"><div className="stat-value">{formatGBP(totalCommission)}</div><div className="stat-label">Commission earned</div></div>
          <div className="stat-card"><div className="stat-value">{jobCharges.length}</div><div className="stat-label">Completed jobs</div></div>
          <div className="stat-card"><div className="stat-value">{formatGBP(totalGmv)}</div><div className="stat-label">Surveyor fees (GMV)</div></div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Platform settings</span></div>
        <form onSubmit={save}>
          <div className="form-group">
            <label>Commission rate (%)</label>
            <input type="number" step="0.1" value={rate} onChange={e => setRate(e.target.value)} placeholder="10" />
            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>Added on top of the surveyor's fee on each completed job.</p>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Surveyor plan (£/month)</label>
              <input type="number" value={survPrice} onChange={e => setSurvPrice(e.target.value)} placeholder="Not set" />
            </div>
            <div className="form-group">
              <label>Organisation plan (£/month)</label>
              <input type="number" value={orgPrice} onChange={e => setOrgPrice(e.target.value)} placeholder="Not set" />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </form>
      </div>
    </>
  )
}

function Empty({ icon, title }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
    </div>
  )
}
