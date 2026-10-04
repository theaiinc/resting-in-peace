import { useState } from 'react'
import { parseCoords } from '../utils/geo'
import { MapPin } from 'lucide-react'

export function CoordModal({ onConfirm, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const coords = parseCoords(value)
    if (!coords) {
      setError('Invalid coordinates. Use format: lat, lng (e.g. 40.7128, -74.0060)')
      return
    }
    onConfirm(coords.lat, coords.lng)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title"><MapPin size={18} /> Enter Coordinates</div>
        <form onSubmit={handleSubmit}>
          <input
            className="modal-input"
            type="text"
            placeholder="40.7128, -74.0060"
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {error && (
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8 }}>
              {error}
            </div>
          )}
          <div className="modal-hint">Format: latitude, longitude (decimal degrees)</div>
          <div className="modal-actions">
            <button type="button" className="modal-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary">
              Drop Pin
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
