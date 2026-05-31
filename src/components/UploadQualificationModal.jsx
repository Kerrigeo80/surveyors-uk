import { useState } from 'react'
import { useApp } from '../lib/AppContext.jsx'
import { QUALIFICATION_TYPES } from '../lib/data.js'

export default function UploadQualificationModal({ onClose }) {
  const { addDocument, showToast } = useApp()
  const [type, setType] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [fileName, setFileName] = useState('Click to select a file (PDF, JPG, PNG)')
  const [hasFile, setHasFile] = useState(false)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) {
      setFileName(f.name)
      setHasFile(true)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    addDocument({
      id: 'd-' + Date.now(),
      type, title, date,
      fileName: hasFile ? fileName : 'document.pdf',
      status: 'pending',
    })
    showToast('Document uploaded — pending verification', 'success')
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
            <p>{fileName}</p>
            <input id="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFile} />
          </label>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Upload Document
          </button>
        </form>
      </div>
    </div>
  )
}
