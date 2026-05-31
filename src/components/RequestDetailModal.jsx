import { useApp } from '../lib/AppContext.jsx'
import { formatDateGB, qualLabel, getInitials, QUALIFICATION_TYPES } from '../lib/data.js'

export default function RequestDetailModal({ request: r, onClose }) {
  const { users, currentUser, toggleInterest } = useApp()
  if (!r) return null

  const council = users.find(u => u.id === r.councilId)
  const councilLabel = council ? (council.councilName || council.name) : 'Unknown'
  const interestedSurveyors = r.interests.map(uid => users.find(u => u.id === uid)).filter(Boolean)
  const interested = r.interests.includes(currentUser?.id)
  const deadlineStr = new Date(r.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>{r.title}</h3>
        <span className={`badge badge-${r.status}`} style={{ margin: '8px 0 16px', display: 'inline-block' }}>
          {r.status}
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div><strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>Council</strong><br />{councilLabel}</div>
          <div><strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>Survey Type</strong><br /><span className="badge badge-qual">{qualLabel(r.type)}</span></div>
          <div><strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>Location</strong><br />{r.address}</div>
          <div><strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>Region</strong><br />{r.region}</div>
          <div><strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>Deadline</strong><br />{deadlineStr}</div>
          <div><strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>Budget</strong><br />{r.budget || 'Not specified'}</div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>Description</strong>
          <p style={{ marginTop: '4px', lineHeight: 1.6, fontSize: '14px' }}>{r.description}</p>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <strong style={{ fontSize: '12px', color: 'var(--text-light)' }}>Contact</strong><br />{r.contact}
        </div>

        {currentUser?.role === 'surveyor' && r.status === 'open' && (
          <button
            className={`btn ${interested ? 'btn-danger' : 'btn-primary'}`}
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => { toggleInterest(r.id); onClose() }}
          >
            {interested ? 'Withdraw Interest' : 'Express Interest'}
          </button>
        )}

        {currentUser?.role === 'council' && interestedSurveyors.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
            <strong>Interested Surveyors ({interestedSurveyors.length})</strong>
            {interestedSurveyors.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                  {getInitials(s.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>
                    {s.region} · {(s.qualifications || []).map(q => QUALIFICATION_TYPES.find(t => t.id === q)?.label || q).join(', ')}
                  </div>
                  {s.rics && <div style={{ fontSize: '12px', color: 'var(--text-light)' }}>RICS: {s.rics}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
