import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { useApp } from '../lib/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { QUALIFICATION_TYPES } from '../lib/data.js'

const VALID_QUALS = new Set(QUALIFICATION_TYPES.map(q => q.id))

function normalizeQuals(raw) {
  if (!raw) return []
  return String(raw)
    .split(/[,;|]/)
    .map(s => s.trim().toLowerCase())
    .filter(s => VALID_QUALS.has(s))
}

function rowToProfile(row) {
  const get = (k) => {
    const key = Object.keys(row).find(rk => rk.toLowerCase().trim() === k)
    return key ? String(row[key] || '').trim() : ''
  }
  const name = get('name') || get('full name')
  if (!name) return null
  return {
    name,
    email: (get('email') || '').toLowerCase() || null,
    rics: get('rics') || get('rics number') || null,
    region: get('region') || null,
    position_title: get('position') || get('title') || get('position_title') || null,
    company: get('company') || get('employer') || null,
    linkedin_url: get('linkedin') || get('linkedin_url') || get('url') || null,
    qualifications: normalizeQuals(get('qualifications') || get('quals') || ''),
    bio: get('bio') || get('summary') || null,
    raw_csv_row: row,
  }
}

export default function LinkedInImport({ onImported }) {
  const { currentUser, showToast } = useApp()
  const fileRef = useRef(null)
  const [rows, setRows] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [committing, setCommitting] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setParseError(null)
    setRows(null)
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        if (results.errors?.length) {
          setParseError(results.errors[0].message)
        }
        const parsed = results.data.map(rowToProfile).filter(Boolean)
        if (!parsed.length) {
          setParseError('No usable rows. CSV needs at least a "name" column.')
        }
        setRows(parsed)
      },
      error: (err) => setParseError(err.message),
    })
  }

  const handleCommit = async () => {
    if (!rows?.length) return
    setCommitting(true)
    const payload = rows.map(r => ({ ...r, imported_by: currentUser.id }))
    const { error } = await supabase.from('linkedin_profiles').insert(payload)
    setCommitting(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    showToast(`Imported ${rows.length} LinkedIn profiles`, 'success')
    setRows(null)
    if (fileRef.current) fileRef.current.value = ''
    onImported?.()
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Import LinkedIn profiles</span>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-light)', marginBottom: '16px' }}>
        Upload a CSV. Expected columns (case-insensitive, all but <code>name</code> optional):{' '}
        <code>name, email, rics, region, position, company, linkedin_url, qualifications, bio</code>.
        Qualifications can be a comma- or semicolon-separated list of these IDs:{' '}
        <code>{QUALIFICATION_TYPES.map(q => q.id).join(', ')}</code>.
      </p>

      <label className="upload-zone" htmlFor="linkedinCsv" style={{ display: 'block' }}>
        <div className="upload-icon">📥</div>
        <p>{rows ? `${rows.length} rows ready to import` : 'Click to select a CSV file'}</p>
        <input id="linkedinCsv" ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={handleFile} />
      </label>

      {parseError && (
        <div style={{ background: 'var(--danger-bg)', color: '#9b2c2c', padding: '10px 14px', borderRadius: 'var(--radius)', marginBottom: '12px', fontSize: '13px' }}>
          {parseError}
        </div>
      )}

      {rows?.length > 0 && (
        <>
          <table className="data-table" style={{ marginBottom: '12px' }}>
            <thead>
              <tr><th>Name</th><th>Email</th><th>RICS</th><th>Region</th><th>Quals</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 6).map((r, i) => (
                <tr key={i}>
                  <td>{r.name}</td>
                  <td>{r.email || '—'}</td>
                  <td>{r.rics || '—'}</td>
                  <td>{r.region || '—'}</td>
                  <td style={{ fontSize: '12px' }}>{r.qualifications.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 6 && (
            <p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '12px' }}>
              Preview shows 6 of {rows.length}.
            </p>
          )}
          <button className="btn btn-primary" disabled={committing} onClick={handleCommit}>
            {committing ? 'Importing…' : `Import ${rows.length} profiles`}
          </button>
        </>
      )}
    </div>
  )
}
