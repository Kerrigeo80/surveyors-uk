import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { HAZARD_CATEGORIES } from '../lib/data.js'

// Public, no-login intake form. A resident reaches this via their landlord/
// council's shared link (/report/:orgId) and submits an issue. Reports land in
// that org's queue for staff to triage into a job. The submit time starts the
// statutory clock, so reporting here is the accurate clock-start.
export default function ResidentReport() {
  const { orgId } = useParams()
  const [orgName, setOrgName] = useState(undefined) // undefined = loading, null = not found
  const [form, setForm] = useState({
    resident_name: '', resident_contact: '', address: '', postcode: '', category: '', description: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    let alive = true
    supabase.rpc('org_public_name', { p_org_id: orgId }).then(({ data, error }) => {
      if (!alive) return
      setOrgName(error ? null : (data || null))
    })
    return () => { alive = false }
  }, [orgId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) { setError('Please describe the issue.'); return }
    setSubmitting(true)
    setError('')
    const { error } = await supabase.rpc('submit_hazard_report', {
      p_org_id: orgId,
      p_resident_name: form.resident_name,
      p_resident_contact: form.resident_contact,
      p_address: form.address,
      p_postcode: form.postcode,
      p_category: form.category,
      p_description: form.description,
    })
    setSubmitting(false)
    if (error) { setError('Sorry, something went wrong. Please try again.'); return }
    setDone(true)
  }

  const wrap = { maxWidth: '620px', margin: '40px auto', padding: '0 20px' }

  if (orgName === undefined) {
    return <div style={wrap}><p style={{ color: 'var(--text-light)' }}>Loading…</p></div>
  }
  if (orgName === null) {
    return (
      <div style={wrap}>
        <div className="card">
          <h2>Link not found</h2>
          <p style={{ color: 'var(--text-light)' }}>
            This reporting link isn’t valid. Please check the link your landlord or council gave you.
          </p>
        </div>
      </div>
    )
  }
  if (done) {
    return (
      <div style={wrap}>
        <div className="card">
          <h2>✅ Thank you</h2>
          <p style={{ lineHeight: 1.6 }}>
            <strong>{orgName}</strong> has received your report and will be in touch. If this is an
            emergency that puts anyone at immediate risk, please also contact them directly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={wrap}>
      <div className="card">
        <h2 style={{ marginBottom: '4px' }}>Report a problem with your home</h2>
        <p style={{ color: 'var(--text-light)', marginBottom: '20px' }}>
          To <strong>{orgName}</strong>. Tell us what’s wrong and we’ll arrange for it to be looked at.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Your name</label>
              <input type="text" value={form.resident_name} onChange={set('resident_name')} placeholder="Optional" />
            </div>
            <div className="form-group">
              <label>Phone or email</label>
              <input type="text" value={form.resident_contact} onChange={set('resident_contact')} placeholder="So they can reach you" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Address</label>
              <input type="text" value={form.address} onChange={set('address')} placeholder="Where is the problem?" />
            </div>
            <div className="form-group">
              <label>Postcode</label>
              <input type="text" value={form.postcode} onChange={set('postcode')} placeholder="e.g. BN2 1TL" />
            </div>
          </div>
          <div className="form-group">
            <label>Type of problem</label>
            <select value={form.category} onChange={set('category')}>
              <option value="">Not sure / other</option>
              {HAZARD_CATEGORIES.map(h => <option key={h.id} value={h.id}>{h.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Describe the problem</label>
            <textarea rows={5} value={form.description} onChange={set('description')}
              placeholder="What’s wrong, where, and how long it’s been happening." required />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: '14px', marginBottom: '12px' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send report'}
          </button>
        </form>
      </div>
    </div>
  )
}
