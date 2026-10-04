import { useState, useEffect, useRef } from 'react'
import { useVoice } from '../hooks/useVoice'
import { fmtSec } from '../utils/geo'
import { X, Check, Pencil, Route, Trash2, Save, Square, Mic } from 'lucide-react'

export function PlaceSheet({
  place,
  onClose,
  onUpdate,
  onRemove,
  onUploadAudio,
  onDeleteAudio,
  routeIds,
  onAddToRoute,
  onRemoveFromRoute,
  showToast,
}) {
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState(place.name || '')
  const [brief, setBrief] = useState(place.brief || '')
  const [saving, setSaving] = useState(false)
  const [audioUrl, setAudioUrl] = useState(place.audio_url || null)
  const [uploadingAudio, setUploadingAudio] = useState(false)

  const voice = useVoice()
  const holdTimerRef = useRef(null)
  const isHoldingRef = useRef(false)

  // Sync if place changes externally
  useEffect(() => {
    setName(place.name || '')
    setBrief(place.brief || '')
    setAudioUrl(place.audio_url || null)
  }, [place])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(place.id, { name, brief })
    setSaving(false)
    setEditMode(false)
    showToast && showToast('Place updated')
  }

  const handleRemove = async () => {
    if (!window.confirm(`Delete "${name || 'this place'}"?`)) return
    await onRemove(place.id)
    onClose()
  }

  // Voice recording handlers
  const handleRecPointerDown = () => {
    isHoldingRef.current = true
    holdTimerRef.current = setTimeout(async () => {
      if (isHoldingRef.current) {
        await voice.startRecording()
      }
    }, 150)
  }

  const handleRecPointerUp = async () => {
    isHoldingRef.current = false
    clearTimeout(holdTimerRef.current)
    if (voice.isRecording) {
      voice.stopRecording()
    } else if (!voice.audioBlob) {
      // Tap to toggle
      await voice.startRecording()
    }
  }

  const handleRecTap = async () => {
    if (voice.isRecording) {
      voice.stopRecording()
    } else {
      await voice.startRecording()
    }
  }

  const handleSaveAudio = async () => {
    if (!voice.audioBlob) return
    setUploadingAudio(true)
    const url = await onUploadAudio(place.id, voice.audioBlob)
    setUploadingAudio(false)
    if (url) {
      setAudioUrl(url)
      voice.clearAudio()
      showToast && showToast('Voice note saved')
    } else {
      showToast && showToast('Upload failed')
    }
  }

  const handleDeleteAudio = async () => {
    await onDeleteAudio(place.id)
    setAudioUrl(null)
    showToast && showToast('Voice note deleted')
  }

  const inRoute = routeIds.includes(place.id)

  return (
    <div className="place-sheet-overlay" onClick={onClose}>
      <div className="place-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div className="sheet-header">
          {editMode ? (
            <textarea
              className="sheet-name sheet-name-edit"
              value={name}
              onChange={e => setName(e.target.value)}
              rows={1}
              autoFocus
            />
          ) : (
            <div className="sheet-name" style={{ overflowWrap: 'break-word' }}>
              {name || <span style={{ color: 'var(--text2)' }}>Unnamed place</span>}
            </div>
          )}
          <button className="sheet-close" onClick={onClose} title="Close"><X size={20} /></button>
        </div>

        <div className="sheet-coords">
          {place.lat.toFixed(6)}, {place.lng.toFixed(6)}
        </div>

        {editMode ? (
          <textarea
            className="sheet-brief sheet-brief-edit"
            value={brief}
            onChange={e => setBrief(e.target.value)}
            rows={3}
            placeholder="Add a description…"
          />
        ) : (
          <div className="sheet-brief" style={{ color: brief ? 'var(--text2)' : 'var(--text2)', opacity: brief ? 1 : 0.5 }}>
            {brief || 'No description'}
          </div>
        )}

        <hr className="sheet-divider" />

        {/* Actions row */}
        <div className="sheet-actions">
          {editMode ? (
            <>
              <button className="sheet-btn primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : <><Check size={16} /> Save</>}
              </button>
              <button className="sheet-btn" onClick={() => { setEditMode(false); setName(place.name || ''); setBrief(place.brief || '') }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="sheet-btn" onClick={() => setEditMode(true)}><Pencil size={16} /> Edit</button>
              <button
                className="sheet-btn"
                onClick={() => inRoute ? onRemoveFromRoute(place.id) : onAddToRoute(place.id)}
              >
                <Route size={16} /> {inRoute ? 'Remove Route' : 'Add Route'}
              </button>
              <button className="sheet-btn danger" onClick={handleRemove}><Trash2 size={16} /> Delete</button>
            </>
          )}
        </div>

        <hr className="sheet-divider" />

        {/* Voice note section */}
        <div className="voice-section">
          <div className="voice-label">Voice Note</div>

          {/* Existing saved voice note */}
          {audioUrl && !voice.audioBlob && (
            <div className="voice-player">
              <audio controls src={audioUrl} preload="none" />
              <button className="sheet-btn danger" style={{ flexShrink: 0 }} onClick={handleDeleteAudio} title="Delete voice note">
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {/* Freshly recorded blob (not yet saved) */}
          {voice.audioBlob && (
            <div className="voice-player" style={{ flexDirection: 'column', gap: 6 }}>
              <audio controls src={URL.createObjectURL(voice.audioBlob)} preload="auto" style={{ width: '100%' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="sheet-btn primary"
                  onClick={handleSaveAudio}
                  disabled={uploadingAudio}
                  style={{ flex: 1 }}
                >
                  {uploadingAudio ? 'Uploading…' : <><Save size={16} /> Save Note</>}
                </button>
                <button className="sheet-btn danger" onClick={() => voice.clearAudio()}>
                  <Trash2 size={16} /> Discard
                </button>
              </div>
            </div>
          )}

          {/* Recorder controls */}
          {!voice.audioBlob && (
            <div className="voice-rec-row" style={{ marginTop: audioUrl ? 8 : 0 }}>
              <button
                className={`rec-btn ${voice.isRecording ? 'recording' : ''}`}
                onClick={handleRecTap}
                onPointerDown={handleRecPointerDown}
                onPointerUp={handleRecPointerUp}
                title={voice.isRecording ? 'Stop recording' : 'Record voice note'}
              >
                {voice.isRecording ? <Square size={18} fill="currentColor" /> : <Mic size={20} />}
              </button>
              {voice.isRecording && (
                <span className="rec-timer">{fmtSec(voice.recSeconds)}</span>
              )}
              {!voice.isRecording && !audioUrl && (
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  Tap or hold to record
                </span>
              )}
              {!voice.isRecording && audioUrl && (
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                  Tap to re-record
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
