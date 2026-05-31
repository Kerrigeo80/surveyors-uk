import { useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'
import { formatDateGB, qualLabel, getInitials } from '../lib/data.js'
import SubmitQuoteModal from './SubmitQuoteModal.jsx'

export default function RequestDetailModal({ request: r, onClose }) {
  const { users, currentUser, awardQuote, withdrawQuote, updateRequestStatus } = useApp()
  const [showSubmit, setShowSubmit] = useState(false)
  if (!r) return null

  const council = users.find(u => u.id === r.councilId)
  const requesterLabel = council ? (council.councilName || council.businessName || council.name) : 'Requester'
  const deadlineStr = new Date(r.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const isRequester = currentUser?.id === r.councilId
  const isAdmin = currentUser?.role === 'admin'
  const isSurveyor = currentUser?.role === 'surveyor'
  const myQuote = r.myQuote

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>{r.title}</h3>
        <span className="badge" style={{ margin: '8px 0 16px', display: 'inline-block', background: '#edf2f7', color: '#4a5568' }}>
          {r.status.replace('_', ' ')}
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <Field label="Requester" value={requesterLabel} />
          <Field label="Survey Type" value={<span className="badge badge-qual">{qualLabel(r.type)}</span>} />
          <Field label="Location" value={r.address} />
          <Field label="Region" value={r.region} />
          <Field label="Deadline" value={deadlineStr} />
          <Field label="Budget" value={r.budget || 'Not specified'} />
        </div>

        <Section label="Description">
          <p style={{ marginTop: '4px', lineHeight: 1.6, fontSize: '14px' }}>{r.description}</p>
        </Section>

        <Section label="Contact"><span>{r.contact}</span></Section>

        {/* Surveyor: submit / withdraw quote */}
        {isSurveyor && r.status === 'open' && !myQuote && currentUser.status === 'active' && (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
            onClick={() => setShowSubmit(true)}>
            Submit a Quote
          </button>
        )}
        {isSurveyor && myQuote && (
          <div style={{ marginTop: '20px', padding: '16px', border: '2px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Your Quote</div>
            <div className="request-meta" style={{ margin: '4px 0' }}>
              <span>£{Number(myQuote.price || 0)}</span>
              <span>{myQuote.days_to_complete || '?'} days</span>
              <span className={`badge badge-${myQuote.status === 'won' ? 'verified' : myQuote.status === 'lost' ? 'closed' : 'pending'}`}>
                {myQuote.status}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '8px' }}>{myQuote.scope_notes}</p>
            {myQuote.status === 'submitted' && r.status === 'open' && (
              <button className="btn btn-danger btn-sm" style={{ marginTop: '12px' }}
                onClick={() => { withdrawQuote(myQuote.id); onClose() }}>
                Withdraw Quote
              </button>
            )}
          </div>
        )}

        {/* Requester: review quotes + award + lifecycle */}
        {(isRequester || isAdmin) && r.quotes.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <strong>Received Quotes ({r.quotes.length})</strong>
            {r.quotes.map(q => {
              const surveyor = users.find(u => u.id === q.surveyor_id)
              const won = q.status === 'won'
              const lost = q.status === 'lost'
              return (
                <div key={q.id} style={{
                  marginTop: '12px', padding: '14px',
                  border: won ? '2px solid var(--success)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius)', background: won ? 'var(--success-bg)' : 'white',
                  opacity: lost ? 0.55 : 1,
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)',
                      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px', flexShrink: 0,
                    }}>
                      {getInitials(surveyor?.name || '?')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 600 }}>{surveyor?.name || 'Unknown surveyor'}</div>
                        <span className={`badge badge-${won ? 'verified' : lost ? 'closed' : 'pending'}`}>{q.status}</span>
                      </div>
                      <div className="request-meta" style={{ margin: '4px 0' }}>
                        <span>£{Number(q.price || 0)}</span>
                        <span>{q.days_to_complete || '?'} days</span>
                        {surveyor?.rics && <span>RICS {surveyor.rics}</span>}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '8px' }}>{q.scope_notes}</p>
                      {r.status === 'open' && q.status === 'submitted' && isRequester && (
                        <button className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}
                          onClick={() => { awardQuote(q); onClose() }}>
                          Award to this surveyor
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Requester: lifecycle progression */}
        {isRequester && r.status === 'awarded' && (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
            onClick={() => { updateRequestStatus(r.id, 'in_progress'); onClose() }}>
            Mark In Progress
          </button>
        )}
        {isRequester && r.status === 'in_progress' && (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
            onClick={() => { updateRequestStatus(r.id, 'completed'); onClose() }}>
            Mark Completed
          </button>
        )}
      </div>
      {showSubmit && <SubmitQuoteModal request={r} onClose={() => { setShowSubmit(false); onClose() }} />}
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>{label}</strong>
      <br />{value}
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>{label}</strong>
      {children}
    </div>
  )
}
