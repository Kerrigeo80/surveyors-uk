import { useState, useEffect } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { UK_REGIONS, QUALIFICATION_TYPES, PROPERTY_TYPES, AVAILABILITY_OPTIONS, ENTITY_TYPES, FEE_BANDS, getInitials, formatDateGB, qualLabel, totalUnreadMessages, isMatch, urgencyRank, verificationChecklist, feeBandPiMin, feeBandLabel, entityTypeLabel, formatGBP } from '../lib/data.js'
import RequestCard from '../components/RequestCard.jsx'
import RequestDetailModal from '../components/RequestDetailModal.jsx'
import UploadQualificationModal from '../components/UploadQualificationModal.jsx'
import DocumentLink from '../components/DocumentLink.jsx'
import Messages from '../components/Messages.jsx'
import { RatingDisplay } from '../components/RatingStars.jsx'
import ChangePassword from '../components/ChangePassword.jsx'

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'verification', label: '✅ Verification' },
  { id: 'qualifications', label: '📄 My Qualifications' },
  { id: 'requests', label: '📋 Available Requests' },
  { id: 'my-interests', label: '⭐ My Quotes' },
  { id: 'my-offers', label: '📨 Job Offers' },
  { id: 'billing', label: '💷 Earnings' },
  { id: 'messages', label: '💬 Messages' },
  { id: 'profile', label: '⚙️ Edit Profile' },
]

export default function SurveyorDashboard() {
  const { currentUser, requests, conversations, offers, logout } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'overview')
  const unreadMessages = totalUnreadMessages(conversations, currentUser?.id)
  const openOffers = (offers || []).filter(o => o.surveyorId === currentUser?.id && o.status === 'offered').length

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

  // Jobs matched to this surveyor (skill + area + available), most urgent first.
  const matching = requests
    .filter(r => r.status === 'open' && isMatch(r, currentUser))
    .sort((a, b) => urgencyRank(a) - urgencyRank(b))
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
                  {t.id === 'my-offers' && openOffers > 0 && (
                    <span className="badge" style={{ marginLeft: '6px', background: 'var(--accent)', color: 'var(--primary)' }}>{openOffers}</span>
                  )}
                </a>
              ))}
              <a onClick={() => { logout(); navigate('/') }} style={{ color: 'var(--danger)' }}>🚪 Sign Out</a>
            </nav>
          </div>
        </div>

        <div className="main-content">
          {currentUser.status !== 'rejected' && !currentUser.workReady && (() => {
            const remaining = verificationChecklist(currentUser).filter(s => !s.done).length
            return (
              <div className="card" style={{ background: '#fefcbf', borderLeft: '4px solid #d69e2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <strong>⏳ Not yet verified to take work.</strong> You have {remaining} step{remaining !== 1 ? 's' : ''} left
                  before you can quote or accept jobs. You can still browse and update your profile.
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setTab('verification')}>Complete verification</button>
              </div>
            )
          })()}
          {currentUser.workReady && (
            <div className="card" style={{ background: 'var(--success-bg)', borderLeft: '4px solid var(--success)' }}>
              <strong>✅ Verified.</strong> You're cleared to quote on and accept jobs.
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
          {tab === 'verification' && <VerificationTab user={currentUser} onGoTab={setTab} />}
          {tab === 'qualifications' && <QualificationsTab user={currentUser} onUpload={() => setUploadOpen(true)} />}
          {tab === 'requests' && <RequestsTab onView={setDetailReq} />}
          {tab === 'my-interests' && <MyInterestsTab myInterests={myInterests} onView={setDetailReq} />}
          {tab === 'my-offers' && <OffersTab user={currentUser} />}
          {tab === 'billing' && <EarningsTab user={currentUser} />}
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

function GateRow({ done, label, detail, action }) {
  return (
    <li className="qual-item">
      <div className="qual-info">
        <span style={{ fontSize: '18px' }}>{done ? '✅' : '⬜'}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '14px' }}>{label}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>{detail}</div>
        </div>
      </div>
      {action}
    </li>
  )
}

function VerificationTab({ user, onGoTab }) {
  const steps = verificationChecklist(user)
  const doneCount = steps.filter(s => s.done).length
  return (
    <>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Verification — {doneCount}/{steps.length} complete</span>
          {user.workReady
            ? <span className="badge badge-verified">Ready to work</span>
            : <span className="badge badge-pending">In progress</span>}
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '0 0 12px' }}>
          You must clear all four steps before you can quote on or accept jobs. This keeps every job
          covered by a properly insured, registered surveyor.
        </p>
        <ul className="qual-list">
          {steps.map(s => (
            <GateRow key={s.key} done={s.done} label={s.label} detail={s.detail}
              action={(s.key === 'insurance' || s.key === 'qualification') && !s.done
                ? <button className="btn btn-outline btn-sm" onClick={() => onGoTab('qualifications')}>Go</button>
                : null} />
          ))}
        </ul>
      </div>
      <EntityForm user={user} />
      <LiabilityCard user={user} />
    </>
  )
}

function EntityForm({ user }) {
  const { updateCurrentUser, showToast } = useApp()
  const [entityType, setEntityType] = useState(user.entityType || '')
  const [tradingName, setTradingName] = useState(user.tradingName || '')
  const [companyNumber, setCompanyNumber] = useState(user.companyNumber || '')
  const [vatNumber, setVatNumber] = useState(user.vatNumber || '')
  const [feeBand, setFeeBand] = useState(user.feeBand || 'under_100k')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!entityType) { showToast('Choose how you trade', 'error'); return }
    if (entityType === 'limited_company' && !companyNumber.trim()) {
      showToast('Company number is required for a limited company', 'error'); return
    }
    setSaving(true)
    await updateCurrentUser({
      entityType, tradingName,
      companyNumber: entityType === 'limited_company' ? companyNumber.trim() : '',
      vatNumber, feeBand,
    })
    setSaving(false)
    showToast('Business details saved — awaiting verification', 'success')
  }

  const badge = user.entityStatus === 'verified'
    ? <span className="badge badge-verified">verified</span>
    : user.entityStatus === 'rejected'
      ? <span className="badge badge-rejected">rejected</span>
      : <span className="badge badge-pending">{user.entityType ? 'pending' : 'not submitted'}</span>

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <span className="card-title">🏢 Your business entity</span>
        {badge}
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '0 0 12px' }}>
        You take this work on as your own entity, so liability sits with you — not the council or the
        platform. Tell us how you trade.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>How do you trade?</label>
            <select value={entityType} onChange={e => setEntityType(e.target.value)} required>
              <option value="">Select...</option>
              {ENTITY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Annual fee income (sets your insurance minimum)</label>
            <select value={feeBand} onChange={e => setFeeBand(e.target.value)}>
              {FEE_BANDS.map(b => <option key={b.id} value={b.id}>{b.label} → min {formatGBP(b.piMin)} PI</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Trading / business name</label>
          <input type="text" value={tradingName} onChange={e => setTradingName(e.target.value)} placeholder="e.g. J. Walker Surveying Ltd" />
        </div>
        {entityType === 'limited_company' ? (
          <div className="form-row">
            <div className="form-group">
              <label>Companies House number</label>
              <input type="text" value={companyNumber} onChange={e => setCompanyNumber(e.target.value)} placeholder="e.g. 09876543" />
            </div>
            <div className="form-group">
              <label>VAT number (optional)</label>
              <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="GB123456789" />
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label>VAT number (optional)</label>
            <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} placeholder="GB123456789" />
          </div>
        )}
        {user.entityStatus === 'verified' && user.companyName && (
          <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            Verified as <strong>{user.companyName}</strong>{user.companyStatus ? ` (${user.companyStatus})` : ''}.
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save business details'}</button>
      </form>
    </div>
  )
}

function LiabilityCard({ user }) {
  const { updateCurrentUser, showToast } = useApp()
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const signed = !!user.liabilityDeclaredAt

  const sign = async () => {
    if (!agreed) return
    setSaving(true)
    await updateCurrentUser({ liabilityDeclaredAt: new Date().toISOString() })
    setSaving(false)
    showToast('Declaration signed', 'success')
  }

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <span className="card-title">📝 Liability declaration</span>
        {signed ? <span className="badge badge-verified">signed</span> : <span className="badge badge-pending">required</span>}
      </div>
      {signed ? (
        <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>
          Signed on {formatDateGB(user.liabilityDeclaredAt)}. You've confirmed you operate as your own
          insured entity and accept liability for the work you take on.
        </p>
      ) : (
        <>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', margin: '4px 0 14px' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: '3px' }} />
            <span>I confirm I take on work through my own registered entity, carry my own valid Professional
              Indemnity insurance, and accept full professional liability for the work I deliver through this platform.</span>
          </label>
          <button className="btn btn-primary" disabled={!agreed || saving} onClick={sign}>{saving ? 'Signing…' : 'Sign declaration'}</button>
        </>
      )}
    </div>
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
  const { requests, currentUser } = useApp()
  const [search, setSearch] = useState('')
  const [qualFilter, setQualFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const [propTypeFilter, setPropTypeFilter] = useState('')
  const [matchedOnly, setMatchedOnly] = useState(true)

  let filtered = requests.filter(r => r.status === 'open')
  if (matchedOnly) filtered = filtered.filter(r => isMatch(r, currentUser))
  if (search) filtered = filtered.filter(r => r.title.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase()))
  if (qualFilter) filtered = filtered.filter(r => r.type === qualFilter)
  if (regionFilter) filtered = filtered.filter(r => r.region === regionFilter)
  if (propTypeFilter) filtered = filtered.filter(r => r.propertyType === propTypeFilter)
  filtered = filtered.slice().sort((a, b) => urgencyRank(a) - urgencyRank(b))

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{matchedOnly ? 'Jobs Matched to You' : 'All Open Requests'}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={matchedOnly} onChange={e => setMatchedOnly(e.target.checked)} />
          Matched to me only
        </label>
      </div>
      {matchedOnly && (
        <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '0 0 12px' }}>
          Open jobs in your coverage area for the survey types you offer, most urgent first.
          Update your coverage and availability under Edit Profile.
        </p>
      )}
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
          <h3>No matching jobs right now</h3>
          <p>{matchedOnly ? 'Try unticking “Matched to me only”, or widen your coverage areas in Edit Profile.' : 'Try adjusting your filters.'}</p>
        </div>
      ) : (
        filtered.map(r => <RequestCard key={r.id} request={r} onView={onView} />)
      )}
    </div>
  )
}

function EarningsTab({ user }) {
  const { jobCharges, requests, settings } = useApp()
  const reqById = new Map(requests.map(r => [r.id, r]))
  const mine = jobCharges.filter(c => c.surveyorId === user.id)
  const totalEarned = mine.reduce((s, c) => s + Number(c.surveyorFee || 0), 0)
  const planPrice = settings?.surveyor_plan_price

  return (
    <>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <span className="card-title">Your plan</span>
          <span className="badge badge-pending">Founding member</span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>
          Free during launch. A surveyor subscription{planPrice != null ? ` of ${formatGBP(planPrice)}/month` : ' (price to be confirmed)'} will
          apply when billing goes live. You always receive your <strong>full agreed fee</strong> — the platform fee is added on top and paid by the organisation.
        </p>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">Earnings ({mine.length})</span>
          {totalEarned > 0 && <span style={{ fontSize: '13px', fontWeight: 600 }}>Total: {formatGBP(totalEarned)}</span>}
        </div>
        {mine.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💷</div>
            <h3>No earnings yet</h3>
            <p>Your fee from each completed job appears here.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Job</th><th>Your fee</th><th>Status</th></tr>
            </thead>
            <tbody>
              {mine.map(c => (
                <tr key={c.id}>
                  <td>{reqById.get(c.requestId)?.title || '—'}</td>
                  <td><strong>{formatGBP(c.surveyorFee)}</strong></td>
                  <td><span className={`badge badge-${c.status === 'paid' ? 'verified' : 'pending'}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

function OffersTab({ user }) {
  const { offers, requests, acceptOffer, declineOffer } = useApp()
  const reqById = new Map(requests.map(r => [r.id, r]))
  const mine = offers.filter(o => o.surveyorId === user.id)
  const open = mine.filter(o => o.status === 'offered')
  const past = mine.filter(o => o.status !== 'offered')

  return (
    <div className="card">
      <div className="card-header"><span className="card-title">Direct job offers</span></div>
      <p style={{ fontSize: '13px', color: 'var(--text-light)', margin: '0 0 12px' }}>
        Councils can offer you a job directly at a set fee. Accepting awards the job to you straight away.
      </p>
      {!user.workReady && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#fefcbf', border: '1px solid #f6e05e', borderRadius: 'var(--radius)', fontSize: '13px' }}>
          You'll need to finish your verification before you can accept an offer.
        </div>
      )}
      {open.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📨</div><h3>No open offers</h3><p>Direct offers from councils will appear here.</p></div>
      ) : open.map(o => {
        const r = reqById.get(o.requestId)
        return (
          <div key={o.id} className="request-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <h4>{r?.title || 'Job offer'}</h4>
              <span className="badge badge-verified">{formatGBP(o.fee)} offered</span>
            </div>
            <div className="request-meta" style={{ margin: '6px 0' }}>
              {r && <span className="badge badge-qual">{qualLabel(r.type)}</span>}
              {r && <span>📍 {r.region}</span>}
              {r?.deadline && <span>📅 Due {formatDateGB(r.deadline)}</span>}
            </div>
            {o.message && <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>“{o.message}”</p>}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-primary btn-sm" disabled={!user.workReady} onClick={() => acceptOffer(o.id)}>Accept</button>
              <button className="btn btn-outline btn-sm" onClick={() => declineOffer(o.id)}>Decline</button>
            </div>
          </div>
        )
      })}
      {past.length > 0 && (
        <>
          <div style={{ margin: '16px 0 8px', fontWeight: 600, fontSize: '13px', color: 'var(--text-light)' }}>Past offers</div>
          {past.map(o => {
            const r = reqById.get(o.requestId)
            return (
              <div key={o.id} className="request-card" style={{ opacity: 0.75 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{r?.title || 'Job offer'} · {formatGBP(o.fee)}</span>
                  <span className={`badge badge-${o.status === 'accepted' ? 'verified' : 'closed'}`}>{o.status}</span>
                </div>
              </div>
            )
          })}
        </>
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
  const [coverage, setCoverage] = useState((currentUser.coverageAreas || []).join(', '))
  const [availability, setAvailability] = useState(currentUser.availabilityStatus || 'available')
  const [availableFrom, setAvailableFrom] = useState(currentUser.availableFrom || '')
  const [acceptsEmergency, setAcceptsEmergency] = useState(!!currentUser.acceptsEmergency)

  const toggleQual = (id) => setQuals(qs => qs.includes(id) ? qs.filter(q => q !== id) : [...qs, id])
  const togglePropType = (id) => setPropTypes(ps => ps.includes(id) ? ps.filter(p => p !== id) : [...ps, id])

  const handleSubmit = (e) => {
    e.preventDefault()
    const coverageAreas = coverage.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    updateCurrentUser({
      name, phone, rics, region, bio, qualifications: quals, propertyTypes: propTypes,
      coverageAreas, availabilityStatus: availability,
      availableFrom: availability === 'available' ? null : (availableFrom || null),
      acceptsEmergency,
    })
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
        <div className="form-group" style={{ paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
          <label>Coverage Areas (postcode prefixes)</label>
          <input type="text" value={coverage} onChange={e => setCoverage(e.target.value)}
            placeholder="e.g. BN, SE1, E14 — comma separated" />
          <p style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
            Jobs whose postcode starts with any of these are matched to you (in addition to your service region).
          </p>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Availability</label>
            <select value={availability} onChange={e => setAvailability(e.target.value)}>
              {AVAILABILITY_OPTIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          {availability !== 'available' && (
            <div className="form-group">
              <label>Available from</label>
              <input type="date" value={availableFrom || ''} onChange={e => setAvailableFrom(e.target.value)} />
            </div>
          )}
        </div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={acceptsEmergency} onChange={e => setAcceptsEmergency(e.target.checked)} />
            I can take on emergency (24-hour) Awaab's Law jobs
          </label>
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
