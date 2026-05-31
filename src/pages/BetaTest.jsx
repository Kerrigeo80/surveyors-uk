import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../lib/AppContext.jsx'
import { supabase } from '../lib/supabase.js'

const SCENARIOS = {
  surveyor: [
    {
      id: 'browse_requests',
      title: 'Browse open survey requests',
      steps: [
        'Click "Available Requests" in the sidebar',
        'Try the search box and the qualification/region filters',
        'Click "View Details" on any request',
      ],
    },
    {
      id: 'submit_quote',
      title: 'Submit a quote',
      steps: [
        'Pick an open request',
        'Click "Submit Quote"',
        'Fill in price (£), days, scope notes — then submit',
        'Check "My Quotes" to see your submission',
      ],
    },
    {
      id: 'upload_credential',
      title: 'Upload a credential',
      steps: [
        'Click "My Qualifications"',
        'Click "+ Upload Document"',
        'Pick a small PDF/image, fill in the details, upload',
        'Check that it appears with status "pending"',
      ],
    },
    {
      id: 'edit_profile',
      title: 'Edit your profile',
      steps: [
        'Click "Edit Profile"',
        'Update your bio, RICS number, region',
        'Save and verify it stuck after refreshing',
      ],
    },
  ],
  council: [
    {
      id: 'create_request',
      title: 'Create a survey request',
      steps: [
        'Click "+ New Request" in the sidebar',
        'Fill in title, type, region, address, deadline, budget, description, contact',
        'Click "Publish Request"',
        'Confirm it appears in "My Requests"',
      ],
    },
    {
      id: 'review_quotes',
      title: 'Review surveyors and quotes',
      steps: [
        'On a request with quotes, click "View Details"',
        'Compare price, days, scope notes between quotes',
        'Try the "Browse Surveyors" tab + filters',
      ],
    },
    {
      id: 'award_job',
      title: 'Award a job',
      steps: [
        'On a request with quotes, open it',
        'Click "Award to this surveyor" on one quote',
        'Watch the request status change to "awarded"',
        'Click "Mark In Progress" then "Mark Completed" to walk the lifecycle',
      ],
    },
    {
      id: 'edit_profile',
      title: 'Edit council profile',
      steps: [
        'Click "Edit Profile"',
        'Update department, phone, about',
        'Save and confirm',
      ],
    },
  ],
  landlord: [
    {
      id: 'add_property',
      title: 'Add a property to your portfolio',
      steps: [
        'Click "My Properties"',
        'Click "+ Add Property"',
        'Fill in address, postcode, region, type — save',
      ],
    },
    {
      id: 'create_request',
      title: 'Create a survey request linked to a property',
      steps: [
        'Click "+ New Request"',
        'In the property dropdown, pick the property you added',
        'Confirm address auto-fills',
        'Fill in the rest, publish',
      ],
    },
    {
      id: 'review_and_award',
      title: 'Review quotes + award',
      steps: [
        'Open a request with quotes',
        'Compare quotes, award one, walk through in-progress/completed',
      ],
    },
    {
      id: 'edit_profile',
      title: 'Edit landlord profile',
      steps: [
        'Click "Edit Profile"',
        'Update business name, type, about',
        'Save and confirm',
      ],
    },
  ],
}

export default function BetaTest() {
  const { currentUser, showToast } = useApp()
  const navigate = useNavigate()

  if (!currentUser) return <Navigate to="/login" replace />

  const role = currentUser.role === 'admin' ? 'surveyor' : currentUser.role
  const scenarios = SCENARIOS[role] || []
  const dash = role === 'surveyor' ? '/surveyor' : role === 'council' ? '/council' : '/landlord'

  return (
    <div className="container">
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <a onClick={() => navigate(dash)} style={{ fontSize: '13px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }}>
            ← Back to dashboard
          </a>
        </div>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Beta testing</h1>
        <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>
          Walk through these scenarios and tell us what works and what doesn't. Every piece of feedback goes straight to Kerri.
        </p>

        {scenarios.map(s => <ScenarioCard key={s.id} scenario={s} user={currentUser} role={role} dash={dash} showToast={showToast} />)}

        <GeneralFeedback user={currentUser} role={role} showToast={showToast} />
      </div>
    </div>
  )
}

function ScenarioCard({ scenario, user, role, dash, showToast }) {
  const navigate = useNavigate()
  const [works, setWorks] = useState(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    if (works === null && !comment.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id, role,
      scenario: scenario.id,
      works_well: works,
      comment: comment.trim() || null,
    })
    setSubmitting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Feedback saved — thank you', 'success')
    setSubmitted(true)
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '8px' }}>{scenario.title}</h3>
      <ol style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: 1.7, marginBottom: '16px' }}>
        {scenario.steps.map((step, i) => <li key={i} style={{ color: 'var(--text)' }}>{step}</li>)}
      </ol>
      <button className="btn btn-outline btn-sm" onClick={() => navigate(dash)} style={{ marginBottom: '16px' }}>
        Go to dashboard to try it
      </button>

      {submitted ? (
        <div style={{ background: 'var(--success-bg)', color: '#276749', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '13px' }}>
          ✓ Thanks for the feedback on this scenario.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => setWorks(true)}
              className={'btn btn-sm ' + (works === true ? 'btn-primary' : 'btn-outline')}>
              👍 Works
            </button>
            <button
              onClick={() => setWorks(false)}
              className={'btn btn-sm ' + (works === false ? 'btn-danger' : 'btn-outline')}>
              👎 Doesn't work
            </button>
          </div>
          <textarea
            value={comment} onChange={e => setComment(e.target.value)}
            rows={2}
            placeholder="What worked, what didn't, any confusion?"
            style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', fontFamily: 'inherit', marginBottom: '10px' }}
          />
          <button className="btn btn-primary btn-sm" disabled={submitting || (works === null && !comment.trim())} onClick={submit}>
            {submitting ? 'Saving…' : 'Submit feedback for this scenario'}
          </button>
        </>
      )}
    </div>
  )
}

function GeneralFeedback({ user, role, showToast }) {
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const submit = async () => {
    if (!comment.trim() && !rating) return
    setSubmitting(true)
    const { error } = await supabase.from('feedback').insert({
      user_id: user.id, role,
      scenario: 'general',
      rating: rating || null,
      comment: comment.trim() || null,
    })
    setSubmitting(false)
    if (error) { showToast(error.message, 'error'); return }
    showToast('Feedback saved — thank you', 'success')
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="card" style={{ background: 'var(--success-bg)' }}>
        <strong>✓ Overall feedback received</strong>
        <p style={{ marginTop: '6px', fontSize: '14px' }}>Thanks for testing — we'll be in touch.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '12px' }}>Overall impression</h3>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '8px' }}>
          How likely are you to use Surveyors UK regularly?
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n}
              onClick={() => setRating(n)}
              className={'btn btn-sm ' + (rating === n ? 'btn-primary' : 'btn-outline')}>
              {n}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-light)', marginTop: '4px' }}>
          1 = not at all · 5 = yes definitely
        </div>
      </div>
      <textarea
        value={comment} onChange={e => setComment(e.target.value)}
        rows={4}
        placeholder="Anything else? Missing features, things that confused you, ideas you'd like to see."
        style={{ width: '100%', padding: '10px 14px', border: '2px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', fontFamily: 'inherit', marginBottom: '12px' }}
      />
      <button className="btn btn-primary" disabled={submitting || (!rating && !comment.trim())} onClick={submit}>
        {submitting ? 'Saving…' : 'Submit overall feedback'}
      </button>
    </div>
  )
}
