import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function DocumentLink({ filePath, label = 'Open' }) {
  const [loading, setLoading] = useState(false)
  if (!filePath) return null
  const handleClick = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.storage.from('credentials').createSignedUrl(filePath, 3600)
    setLoading(false)
    if (error || !data?.signedUrl) {
      alert('Could not load document: ' + (error?.message || 'unknown error'))
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }
  return (
    <a href="#" onClick={handleClick}
      style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
      {loading ? 'Loading…' : label}
    </a>
  )
}
