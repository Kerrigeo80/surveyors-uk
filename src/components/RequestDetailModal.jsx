import { useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'
import { formatDateGB, qualLabel, getInitials, propertyTypeLabel, isInsured, awaabsClock, dueLabel, severityLabel, hazardCategoryLabel, COMPLIANCE_COLOR, isMatch, formatGBP, commissionBreakdown } from '../lib/data.js'
import SubmitQuoteModal from './SubmitQuoteModal.jsx'
import ConversationThread from './ConversationThread.jsx'
import { RatingDisplay, RatingInput } from './RatingStars.jsx'

export default function RequestDetailModal({ request: r, onClose }) {
  const { users, currentUser, conversations, jobCharges, settings, sendMessage, awardQuote, withdrawQuote, updateRequestStatus, setAwaabsMilestone } = useApp()
  const [showSubmit, setShowSubmit] = useState(false)
  const [showThread, setShowThread] = useState(false)     // surveyor ↔ requester
  const [msgSurveyorId, setMsgSurveyorId] = useState(null) // requester → which surveyor
  if (!r) return null

  const council = users.find(u => u.id === r.councilId)
  const requesterLabel = council ? (council.councilName || council.businessName || council.name) : 'Requester'
  const deadlineStr = new Date(r.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const isRequester = currentUser?.id === r.councilId
  const isAdmin = currentUser?.role === 'admin'
  const isSurveyor = currentUser?.role === 'surveyor'
  const myQuote = r.myQuote

  // Existing thread for (this request, a given surveyor), or null if none yet.
  const findConv = (surveyorId) => conversations.find(c => c.request_id === r.id && c.surveyor_id === surveyorId) || null

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
          {r.propertyType && <Field label="Property Type" value={propertyTypeLabel(r.propertyType)} />}
          <Field label="Location" value={r.address} />
          <Field label="Region" value={r.region} />
          <Field label="Deadline" value={deadlineStr} />
          <Field label="Budget" value={r.budget || 'Not specified'} />
        </div>

        <ComplianceSection r={r} canEdit={isRequester || isAdmin} setAwaabsMilestone={setAwaabsMilestone} />

        <Section label="Description">
          <p style={{ marginTop: '4px', lineHeight: 1.6, fontSize: '14px' }}>{r.description}</p>
        </Section>

        <Section label="Contact"><span>{r.contact}</span></Section>

        {/* Surveyor: submit / withdraw quote */}
        {isSurveyor && r.status === 'open' && !myQuote && currentUser.workReady && (
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
            onClick={() => setShowSubmit(true)}>
            Submit a Quote
          </button>
        )}
        {isSurveyor && r.status === 'open' && !myQuote && !currentUser.workReady && (
          <div style={{ marginTop: '16px', padding: '12px 14px', background: '#fefcbf', border: '1px solid #f6e05e', borderRadius: 'var(--radius)', fontSize: '13px' }}>
            Finish your verification (see the <strong>Verification</strong> tab) before you can quote on jobs.
          </div>
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

        {/* Surveyor: message the requester */}
        {isSurveyor && currentUser.workReady && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: '13px' }}>Message {requesterLabel}</strong>
              <button className="btn btn-outline btn-sm" onClick={() => setShowThread(s => !s)}>
                {showThread ? 'Hide' : '💬 Open chat'}
              </button>
            </div>
            {showThread && (
              <div style={{ marginTop: '12px' }}>
                <ConversationThread
                  conversation={findConv(currentUser.id)}
                  peerName={requesterLabel}
                  send={(body) => sendMessage({ requestId: r.id, surveyorId: currentUser.id, requesterId: r.councilId, body })}
                />
              </div>
            )}
          </div>
        )}

        {/* Requester: offer the job directly to a verified surveyor at a set fee */}
        {isRequester && r.status === 'open' && <DirectOfferSection request={r} />}

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
                      <div style={{ margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RatingDisplay rating={surveyor?.rating} count={surveyor?.reviewCount} size={13} />
                        {isInsured(surveyor) && <span className="badge badge-verified">🛡 Insured</span>}
                      </div>
                      <div className="request-meta" style={{ margin: '4px 0' }}>
                        <span>£{Number(q.price || 0)}</span>
                        <span>{q.days_to_complete || '?'} days</span>
                        {surveyor?.rics && <span>RICS {surveyor.rics}</span>}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-light)', marginTop: '8px' }}>{q.scope_notes}</p>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        {r.status === 'open' && q.status === 'submitted' && isRequester && (
                          <button className="btn btn-primary btn-sm"
                            onClick={() => { awardQuote(q); onClose() }}>
                            Award to this surveyor
                          </button>
                        )}
                        {isRequester && (
                          <button className="btn btn-outline btn-sm"
                            onClick={() => setMsgSurveyorId(id => id === q.surveyor_id ? null : q.surveyor_id)}>
                            {msgSurveyorId === q.surveyor_id ? 'Hide chat' : '💬 Message'}
                          </button>
                        )}
                      </div>
                      {isRequester && msgSurveyorId === q.surveyor_id && (
                        <div style={{ marginTop: '12px' }}>
                          <ConversationThread
                            conversation={findConv(q.surveyor_id)}
                            peerName={surveyor?.name || 'surveyor'}
                            send={(body) => sendMessage({ requestId: r.id, surveyorId: q.surveyor_id, requesterId: currentUser.id, body })}
                          />
                        </div>
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

        {/* Payment breakdown once the job is completed */}
        {r.status === 'completed' && (isRequester || isSurveyor || isAdmin) && (() => {
          const charge = jobCharges.find(c => c.requestId === r.id)
          const wonQuote = r.quotes.find(q => q.status === 'won')
          if (!charge && !wonQuote) return null
          const b = charge
            ? { fee: Number(charge.surveyorFee || 0), commission: Number(charge.commissionAmount || 0), total: Number(charge.orgTotal || 0) }
            : commissionBreakdown(wonQuote.price, settings?.commission_rate)
          return (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <strong>Payment</strong>
              <div className="request-meta" style={{ margin: '8px 0' }}>
                <span>Surveyor fee: {formatGBP(b.fee)}</span>
                {!isSurveyor && <span>Platform fee: {formatGBP(b.commission)}</span>}
                {!isSurveyor && <span><strong>Total payable: {formatGBP(b.total)}</strong></span>}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                {isSurveyor
                  ? 'You receive your full fee — the platform fee is added on top and paid by the organisation.'
                  : 'Total includes the platform fee added on top of the surveyor’s fee.'}
              </p>
            </div>
          )
        })()}

        {/* Review: requester rates the winning surveyor once the job is completed */}
        {r.status === 'completed' && (() => {
          const wonQuote = r.quotes.find(q => q.status === 'won')
          const surveyor = wonQuote ? users.find(u => u.id === wonQuote.surveyor_id) : null
          if (!wonQuote) return null
          return (
            <ReviewSection
              request={r}
              surveyorName={surveyor?.name || 'the surveyor'}
              canReview={isRequester}
              existing={r.review}
              onDone={onClose}
            />
          )
        })()}
      </div>
      {showSubmit && <SubmitQuoteModal request={r} onClose={() => { setShowSubmit(false); onClose() }} />}
    </div>
  )
}

function DirectOfferSection({ request: r }) {
  const { users, offers, createOffer, withdrawOffer } = useApp()
  const [surveyorId, setSurveyorId] = useState('')
  const [fee, setFee] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const ready = users.filter(u => u.role === 'surveyor' && u.workReady)
  const sorted = ready.slice().sort((a, b) => (isMatch(r, b) ? 1 : 0) - (isMatch(r, a) ? 1 : 0))
  const sent = offers.filter(o => o.requestId === r.id)

  const send = async () => {
    if (!surveyorId || !fee) return
    setSending(true)
    const ok = await createOffer({ requestId: r.id, surveyorId, fee, message })
    setSending(false)
    if (ok) { setSurveyorId(''); setFee(''); setMessage('') }
  }

  return (
    <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
      <strong>Offer this job directly</strong>
      <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '4px 0 10px' }}>
        Set a fee and offer the job to a verified surveyor — they accept or decline, no quoting. Best for urgent jobs.
      </p>
      {ready.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-light)' }}>No verified surveyors available to offer yet.</p>
      ) : (
        <>
          <div className="form-group">
            <label>Surveyor</label>
            <select value={surveyorId} onChange={e => setSurveyorId(e.target.value)}>
              <option value="">Select a verified surveyor…</option>
              {sorted.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}{isMatch(r, s) ? ' ✓ matches' : ''} — {s.region || '—'}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Fee (£)</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)} placeholder="e.g. 1500" />
          </div>
          <div className="form-group">
            <label>Message (optional)</label>
            <textarea rows={2} value={message} onChange={e => setMessage(e.target.value)} placeholder="Any details for the surveyor" />
          </div>
          <button className="btn btn-primary btn-sm" disabled={sending || !surveyorId || !fee} onClick={send}>
            {sending ? 'Sending…' : 'Send offer'}
          </button>
        </>
      )}
      {sent.length > 0 && (
        <div style={{ marginTop: '14px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Offers sent</div>
          {sent.map(o => {
            const s = users.find(u => u.id === o.surveyorId)
            return (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px' }}>{s?.name || 'Surveyor'} · {formatGBP(o.fee)}</span>
                <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge badge-${o.status === 'accepted' ? 'verified' : o.status === 'offered' ? 'pending' : 'closed'}`}>{o.status}</span>
                  {o.status === 'offered' && <button className="btn btn-outline btn-sm" onClick={() => withdrawOffer(o.id)}>Withdraw</button>}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ReviewSection({ request, surveyorName, canReview, existing, onDone }) {
  const { submitReview } = useApp()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const wrap = {
    marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)',
  }

  // Already reviewed — show it (visible to both requester and surveyor)
  if (existing) {
    return (
      <div style={wrap}>
        <strong style={{ fontSize: '13px' }}>Review</strong>
        <div style={{ margin: '8px 0' }}>
          <RatingDisplay rating={existing.rating} count={null} showCount={false} size={16} />
        </div>
        {existing.comment && (
          <p style={{ fontSize: '13px', color: 'var(--text-light)', lineHeight: 1.5 }}>“{existing.comment}”</p>
        )}
      </div>
    )
  }

  // Only the requester can leave a review
  if (!canReview) return null

  const handleSubmit = async () => {
    if (!rating) return
    setSaving(true)
    const ok = await submitReview(request, { rating, comment })
    setSaving(false)
    if (ok) onDone()
  }

  return (
    <div style={wrap}>
      <strong style={{ fontSize: '13px' }}>Rate {surveyorName}</strong>
      <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '4px 0 10px' }}>
        How was the completed work? Your rating helps other requesters.
      </p>
      <RatingInput value={rating} onChange={setRating} />
      <textarea
        rows={3}
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Optional: a few words about the survey, communication, timeliness…"
        style={{ width: '100%', marginTop: '10px' }}
      />
      <button
        className="btn btn-primary btn-sm"
        style={{ marginTop: '10px' }}
        disabled={!rating || saving}
        onClick={handleSubmit}>
        {saving ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  )
}

function ComplianceSection({ r, canEdit, setAwaabsMilestone }) {
  const clock = awaabsClock(r)
  if (!clock.applies) return null
  const action = { investigate: 'investigated', summary: 'summary_sent', make_safe: 'made_safe' }
  const fmt = (ts) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return (
    <div style={{ marginBottom: '16px', padding: '14px', border: '1px solid #feebc8', background: '#fffaf0', borderRadius: 'var(--radius)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: '13px' }}>⚠ Awaab's Law compliance</strong>
        <span className="badge" style={COMPLIANCE_COLOR[clock.overall] || {}}>
          {clock.overall === 'done' ? 'compliant' : (clock.overall || '').replace('_', ' ')}
        </span>
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-light)', margin: '6px 0 4px' }}>
        {hazardCategoryLabel(r.hazardCategory)} · {severityLabel(r.hazardSeverity)}
        {r.reportedAt && <> · reported {fmt(r.reportedAt)}</>}
      </div>
      {clock.milestones.map(m => (
        <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
              {m.doneAt ? `Done ${fmt(m.doneAt)}` : (m.dueAt ? `Due ${fmt(m.dueAt)} · ${dueLabel(m.dueAt)}` : '—')}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge" style={COMPLIANCE_COLOR[m.status] || {}}>{m.status === 'done' ? '✓ done' : m.status.replace('_', ' ')}</span>
            {canEdit && !m.doneAt && (
              <button className="btn btn-outline btn-sm" onClick={() => setAwaabsMilestone(r.id, action[m.key])}>Mark done</button>
            )}
          </div>
        </div>
      ))}
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
