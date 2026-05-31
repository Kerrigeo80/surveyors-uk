import { useRef, useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'
import { supabase } from '../lib/supabase.js'
import { QUALIFICATION_TYPES } from '../lib/data.js'

export default function UploadQualificationModal({ onClose }) {
  const { currentUser, showToast, refresh } = useApp()
  const fileInputRef = useRef(null)
  const [type, setType] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      showToast('Please select a file', 'error')
      return
    }
    setUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const path = `${currentUser.id}/${Date.now()}-${safeName}`
    const { error: upErr } = await supabase.storage.from('credentials').upload(path, file, {
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })
    if (upErr) {
      setUploading(false)
      showToast('Upload failed: ' + upErr.message, 'error')
      return
    }
    const { error: insErr } = await supabase.from('credential_documents').insert({
      surveyor_id: currentUser.id,
      type, title, issue_date: date,
      file_name: file.name, file_path: path,
      status: 'pending',
    })
    setUploading(false)
    if (insErr) {
      // Best-effort cleanup
      await supabase.storage.from('credentials').remove([path])
      showToast(insErr.message, 'error')
      return
    }
    showToast('Document uploaded — pending verification', 'success')
    await refresh()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Upload Qualification Document</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Qualification Type</label>
            <select value={type} onChange={e => setType(e.target.value)} required>
              <option value="">Select type...</option>
              {QUALIFICATION_TYPES.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Document Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. RICS Chartered Surveyor Certificate" required />
          </div>
          <div className="form-group">
            <label>Issue Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <label className="upload-zone" htmlFor="fileInput" style={{ display: 'block' }}>
            <div className="upload-icon">📁</div>
            <p>{file ? file.name : 'Click to select a file (PDF, JPG, PNG)'}</p>
            <input id="fileInput" ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={(e) => setFile(e.target.files[0] || null)} />
          </label>
          <button type="submit" disabled={uploading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            {uploading ? 'Uploading…' : 'Upload Document'}
          </button>
        </form>
      </div>
    </div>
  )
}
