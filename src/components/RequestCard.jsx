import { useApp } from '../lib/AppContext.jsx'
import { formatDateGB, qualLabel } from '../lib/data.js'

export default function RequestCard({ request: r, compact, onView, showInterest = true }) {
  const { users, currentUser, toggleInterest } = useApp()
  const council = users.find(u => u.id === r.councilId)
  const councilLabel = council ? (council.councilName || council.name) : 'Unknown Council'
  const interested = r.interests.includes(currentUser?.id)

  return (
    <div className="request-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <h4>{r.title}</h4>
        <span className={`badge badge-${r.status}`}>{r.status}</span>
      </div>
      <div className="request-meta">
        <span>🏛 {councilLabel}</span>
        <span>📍 {r.region}</span>
        <span>📅 Due {formatDateGB(r.deadline)}</span>
        <span className="badge badge-qual">{qualLabel(r.type)}</span>
      </div>
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
          {r.interests.length} interest{r.interests.length !== 1 ? 's' : ''}
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => onView?.(r)}>View Details</button>
          {showInterest && currentUser?.role === 'surveyor' && r.status === 'open' && (
            <button
              className={`btn ${interested ? 'btn-danger' : 'btn-primary'} btn-sm`}
              onClick={() => toggleInterest(r.id)}
            >
              {interested ? 'Withdraw' : 'Express Interest'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
