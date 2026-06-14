import { useApp } from '../lib/AppContext.jsx'
import { hazardCategoryLabel, formatDateGB } from '../lib/data.js'

// Org-side intake queue: share the public reporting link, and triage incoming
// resident reports into jobs (or dismiss them). Used by Council + Landlord dashboards.
export default function ResidentReports({ onCreateJob }) {
  const { currentUser, reports, dismissReport, showToast } = useApp()
  const link = `${window.location.origin}/report/${currentUser.id}`
  const mine = reports || []
  const newReports = mine.filter(r => r.status === 'new')
  const handled = mine.filter(r => r.status !== 'new')

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); showToast('Reporting link copied', 'success') }
    catch { showToast('Copy failed — select and copy manually', 'error') }
  }

  const fmt = (ts) => new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header"><span className="card-title">Your resident reporting link</span></div>
        <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '10px' }}>
          Share this link with residents (website, tenancy pack, QR code). Anything they submit lands
          here for your team to triage. The time they report starts the Awaab’s Law clock.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" readOnly value={link} onFocus={e => e.target.select()} style={{ flex: 1 }} />
          <button className="btn btn-outline btn-sm" onClick={copy}>Copy</button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">New Reports</span>
          {newReports.length > 0 && <span className="badge badge-pending">{newReports.length} to triage</span>}
        </div>
        {newReports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🧾</div>
            <h3>No new reports</h3>
            <p>Resident reports submitted via your link will appear here.</p>
          </div>
        ) : (
          newReports.map(r => (
            <div key={r.id} className="request-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <h4>{r.address || 'Address not given'}</h4>
                {r.category && <span className="badge badge-qual">{hazardCategoryLabel(r.category)}</span>}
              </div>
              <div className="request-meta">
                {r.postcode && <span>📍 {r.postcode}</span>}
                {r.resident_name && <span>👤 {r.resident_name}</span>}
                {r.resident_contact && <span>✉ {r.resident_contact}</span>}
                <span>🕒 {fmt(r.reported_at)}</span>
              </div>
              <div className="request-desc">{r.description}</div>
              <div className="request-footer">
                <span style={{ fontSize: '12px', color: 'var(--text-light)' }}>Reported by resident</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => dismissReport(r.id)}>Dismiss</button>
                  <button className="btn btn-primary btn-sm" onClick={() => onCreateJob(r)}>Create job</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {handled.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header"><span className="card-title">Handled</span></div>
          {handled.slice(0, 20).map(r => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
              <span>{r.address || 'Address not given'} · {r.category ? hazardCategoryLabel(r.category) : 'Other'}</span>
              <span className={`badge badge-${r.status === 'triaged' ? 'verified' : 'closed'}`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
