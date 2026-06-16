import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { useApp } from '../lib/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { QUALIFICATION_TYPES, UK_REGIONS } from '../lib/data.js'

const VALID_QUALS = new Set(QUALIFICATION_TYPES.map(q => q.id))

function normalizeQuals(raw) {
  if (!raw) return []
  return String(raw)
    .split(/[,;|]/)
    .map(s => s.trim().toLowerCase())
    .filter(s => VALID_QUALS.has(s))
}

// LinkedIn "Location" is free text (a city or country) — best-effort map to a UK region.
const REGION_BY_CITY = {
  london: 'Greater London', birmingham: 'West Midlands', coventry: 'West Midlands', wolverhampton: 'West Midlands',
  manchester: 'North West', liverpool: 'North West', bolton: 'North West', preston: 'North West',
  leeds: 'Yorkshire and the Humber', sheffield: 'Yorkshire and the Humber', bradford: 'Yorkshire and the Humber', york: 'Yorkshire and the Humber', hull: 'Yorkshire and the Humber',
  newcastle: 'North East', sunderland: 'North East', durham: 'North East',
  nottingham: 'East Midlands', leicester: 'East Midlands', derby: 'East Midlands',
  bristol: 'South West', plymouth: 'South West', exeter: 'South West',
  brighton: 'South East', southampton: 'South East', oxford: 'South East', reading: 'South East', kent: 'South East', surrey: 'South East',
  norwich: 'East of England', cambridge: 'East of England', ipswich: 'East of England',
  glasgow: 'Scotland', edinburgh: 'Scotland', scotland: 'Scotland',
  cardiff: 'Wales', swansea: 'Wales', wales: 'Wales',
  belfast: 'Northern Ireland',
}
function normalizeRegion(raw) {
  if (!raw) return null
  const l = raw.toLowerCase().trim()
  const exact = UK_REGIONS.find(r => r.toLowerCase() === l)
  if (exact) return exact
  for (const [city, region] of Object.entries(REGION_BY_CITY)) {
    if (l.includes(city)) return region
  }
  return null
}

function rowToProfile(row) {
  // Returns the first non-empty value among any of the given header aliases (case-insensitive).
  const get = (...keys) => {
    for (const k of keys) {
      const key = Object.keys(row).find(rk => rk.toLowerCase().trim() === k)
      if (key && String(row[key] || '').trim()) return String(row[key]).trim()
    }
    return ''
  }
  // Accept either a single name column, or LinkedIn's First Name + Last Name.
  const name = get('name', 'full name') || [get('first name'), get('last name')].filter(Boolean).join(' ').trim()
  if (!name) return null
  return {
    name,
    email: (get('email', 'email address') || '').toLowerCase() || null,
    rics: get('rics', 'rics number') || null,
    region: normalizeRegion(get('region', 'location')),
    position_title: get('position', 'title', 'position_title', 'current title', 'headline') || null,
    company: get('company', 'employer', 'current company') || null,
    linkedin_url: get('linkedin', 'linkedin_url', 'url', 'profile url') || null,
    qualifications: normalizeQuals(get('qualifications', 'quals')),
    bio: get('bio', 'summary', 'headline', 'notes') || null,
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
        <code>{QUALIFICATION_TYPES.map(q => q.id).join(', ')}</code>.{' '}
        <strong>A raw LinkedIn export also works directly</strong> (First Name, Last Name, Email Address,
        Current Title, Current Company, Location, Profile URL are mapped automatically).
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
