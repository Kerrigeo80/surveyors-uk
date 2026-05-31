import { useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'
import { qualLabel, formatDateGB } from '../lib/data.js'

export default function SubmitQuoteModal({ request, onClose }) {
  const { submitQuote } = useApp()
  const [price, setPrice] = useState('')
  const [days, setDays] = useState('')
  const [scopeNotes, setScopeNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const ok = await submitQuote(request.id, { price, days, scopeNotes })
    setSubmitting(false)
    if (ok) onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Submit Quote</h3>
        <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius)' }}>
          <div style={{ fontWeight: 600 }}>{request.title}</div>
          <div className="request-meta" style={{ margin: '6px 0 0' }}>
            <span>📍 {request.region}</span>
            <span>📅 Due {formatDateGB(request.deadline)}</span>
            <span className="badge badge-qual">{qualLabel(request.type)}</span>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Price (£)</label>
              <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 2500" required />
            </div>
            <div className="form-group">
              <label>Days to complete</label>
              <input type="number" min="1" value={days} onChange={e => setDays(e.target.value)} placeholder="e.g. 10" required />
            </div>
          </div>
          <div className="form-group">
            <label>Scope notes</label>
            <textarea rows={5} value={scopeNotes} onChange={e => setScopeNotes(e.target.value)}
              placeholder="Briefly describe how you'd approach this work, what's included/excluded, any assumptions." required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
            {submitting ? 'Submitting…' : 'Submit Quote'}
          </button>
        </form>
      </div>
    </div>
  )
}
