import { useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'
import { formatDateGB, qualLabel, propertyTypeLabel, awaabsClock, dueLabel, COMPLIANCE_COLOR } from '../lib/data.js'
import SubmitQuoteModal from './SubmitQuoteModal.jsx'

const STATUS_LABEL = {
  open: 'Open',
  awarded: 'Awarded',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  closed: 'Closed',
}

function statusBadgeStyle(status) {
  switch (status) {
    case 'open': return { background: '#c6f6d5', color: '#276749' }
    case 'awarded': return { background: '#bee3f8', color: '#2c5282' }
    case 'in_progress': return { background: '#fefcbf', color: '#975a16' }
    case 'completed': return { background: '#e9d8fd', color: '#553c9a' }
    case 'cancelled':
    case 'closed': return { background: '#fed7d7', color: '#9b2c2c' }
    default: return { background: '#edf2f7', color: '#4a5568' }
  }
}

export default function RequestCard({ request: r, compact, onView, showQuoteAction = true }) {
  const { users, currentUser } = useApp()
  const [showQuote, setShowQuote] = useState(false)

  const council = users.find(u => u.id === r.councilId)
  const requesterLabel = council ? (council.councilName || council.businessName || council.name) : 'Requester'
  const myQuote = r.myQuote
  const isOpen = r.status === 'open'

  const priceSummary = (() => {
    const prices = r.quotes.filter(q => q.price != null).map(q => Number(q.price))
    if (!prices.length) return null
    const min = Math.min(...prices), max = Math.max(...prices)
    return min === max ? `£${min}` : `£${min} – £${max}`
  })()

  return (
    <>
      <div className="request-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <h4>{r.title}</h4>
          <span className="badge" style={statusBadgeStyle(r.status)}>{STATUS_LABEL[r.status] || r.status}</span>
        </div>
        <div className="request-meta">
          <span>🏛 {requesterLabel}</span>
          <span>📍 {r.region}</span>
          <span>📅 Due {formatDateGB(r.deadline)}</span>
          {r.propertyType && <span>🏠 {propertyTypeLabel(r.propertyType)}</span>}
          <span className="badge badge-qual">{qualLabel(r.type)}</span>
        </div>
        {r.awaabsApplies && (() => {
          const clock = awaabsClock(r)
          if (!clock.applies) return null
          const next = clock.milestones
            .filter(m => m.status !== 'done' && m.dueAt)
            .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0]
          return (
            <div style={{ margin: '6px 0' }}>
              <span className="badge" style={COMPLIANCE_COLOR[clock.overall] || COMPLIANCE_COLOR.on_track}>
                ⚠ Awaab's Law{next ? ` · ${next.label} ${dueLabel(next.dueAt)}` : ' · Compliant'}
              </span>
            </div>
          )
        })()}
        {!compact && (
          <div className="request-desc">
            {r.description.length > 200 ? r.description.substring(0, 200) + '...' : r.description}
          </div>
        )}
        {r.budget && (
          <div style={{ fontSize: '13px', color: 'var(--text-light)' }}>Budget: {r.budget}</div>
        )}
        <div className="request-footer">
          <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>
            {r.quotes.length} quote{r.quotes.length !== 1 ? 's' : ''}
            {priceSummary && ` · ${priceSummary}`}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-outline btn-sm" onClick={() => onView?.(r)}>View Details</button>
            {showQuoteAction && currentUser?.role === 'surveyor' && currentUser.workReady && isOpen && !myQuote && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowQuote(true)}>Submit Quote</button>
            )}
            {showQuoteAction && currentUser?.role === 'surveyor' && myQuote && (
              <span className="badge" style={{ background: '#e6fffa', color: '#234e52' }}>
                Your quote: £{Number(myQuote.price || 0)} · {myQuote.days_to_complete || '?'} days
              </span>
            )}
          </div>
        </div>
      </div>
      {showQuote && <SubmitQuoteModal request={r} onClose={() => setShowQuote(false)} />}
    </>
  )
}
