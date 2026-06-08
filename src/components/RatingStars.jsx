import { useState } from 'react'

// Display-only stars with an optional average + count, e.g. ★★★★☆ 4.2 (5)
export function RatingDisplay({ rating, count, size = 14, showCount = true }) {
  if (!rating) {
    return <span style={{ fontSize: size - 1, color: 'var(--text-light)' }}>No reviews yet</span>
  }
  const rounded = Math.round(rating)
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: size }}>
      <span style={{ color: '#f5a623', letterSpacing: '1px' }} aria-hidden="true">
        {'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}
      </span>
      <strong style={{ fontSize: size - 1 }}>{rating.toFixed(1)}</strong>
      {showCount && count != null && (
        <span style={{ fontSize: size - 2, color: 'var(--text-light)' }}>
          ({count})
        </span>
      )}
    </span>
  )
}

// Interactive 1–5 star picker
export function RatingInput({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  return (
    <div style={{ display: 'inline-flex', gap: '4px' }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: size, lineHeight: 1,
            color: n <= active ? '#f5a623' : '#d0d4dc',
          }}>
          ★
        </button>
      ))}
    </div>
  )
}
