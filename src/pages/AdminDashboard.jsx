import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { getInitials, formatDateGB, qualLabel } from '../lib/data.js'
import LinkedInImport from '../components/LinkedInImport.jsx'
import DocumentLink from '../components/DocumentLink.jsx'
import ChangePassword from '../components/ChangePassword.jsx'

const TABS = [
  { id: 'pending', label: '⏳ Pending Surveyors' },
  { id: 'surveyors', label: '📋 All Surveyors' },
  { id: 'councils', label: '🏛 Councils' },
  { id: 'requests', label: '📑 All Requests' },
  { id: 'documents', label: '📄 Document Review' },
  { id: 'linkedin', label: '📥 LinkedIn Pool' },
  { id: 'feedback', label: '💬 Beta Feedback' },
  { id: 'account', label: '🔑 Account' },
]

export default function AdminDashboard() {
  const { currentUser, users, requests, logout, setSurveyorStatus } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState('pending')
  const [allProfiles, setAllProfiles] = useState(null)
  const [allDocuments, setAllDocuments] = useState(null)
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

  if (allProfiles === null) loadProfiles()
  if (allDocuments === null) loadDocuments()
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

          {tab === 'surveyors' && (
            <div className="card">
              <div className="card-header"><span className="card-title">All Surveyors ({allSurveyors.length})</span></div>
              {allSurveyors.length === 0 ? <Empty icon="🔍" title="No surveyors" />
                : allSurveyors.map(s => <PersonRow key={s.id} p={s} />)}
            </div>
          )}

          {tab === 'councils' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Councils ({allCouncils.length})</span></div>
              {allCouncils.length === 0 ? <Empty icon="🏛" title="No councils" />
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
          <h4>{c.councilName || c.name}</h4>
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

function LinkedInList({ profiles }) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Name</th><th>Email</th><th>RICS</th><th>Region</th><th>Quals</th><th>Status</th>
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

function Empty({ icon, title }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
    </div>
  )
}
