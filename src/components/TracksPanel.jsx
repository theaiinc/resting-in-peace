import { fmtDist, fmtSec } from '../utils/geo'
import { Route, X, Eye, EyeOff, Maximize, Trash2 } from 'lucide-react'

export function TracksPanel({
  tracks,
  visibleTrackIds,
  onToggleVisible,
  onFitTrack,
  onDelete,
  onClose,
}) {
  return (
    <div className="tracks-panel-overlay" onClick={onClose}>
      <div className="tracks-panel" onClick={e => e.stopPropagation()}>
        <div className="tracks-panel-header">
          <span className="tracks-panel-title"><Route size={18} /> Saved Tracks</span>
          <button className="tracks-panel-close" onClick={onClose} title="Close"><X size={20} /></button>
        </div>

        <div className="tracks-list">
          {tracks.length === 0 && (
            <div className="tracks-empty">
              No saved tracks yet.<br />
              GPS will auto-record when you start walking.
            </div>
          )}

          {tracks.map(track => {
            const isVisible = visibleTrackIds.has(track.id)
            const pts = Array.isArray(track.pts) ? track.pts : []
            return (
              <div key={track.id} className="track-item">
                <button
                  className={`track-vis-btn ${isVisible ? 'visible' : ''}`}
                  onClick={() => onToggleVisible(track.id)}
                  title={isVisible ? 'Hide track' : 'Show track'}
                >
                  {isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                <div className="track-info">
                  <div className="track-name">{track.name || 'Unnamed Track'}</div>
                  <div className="track-meta">
                    {track.date && <span>{track.date} · </span>}
                    {fmtDist(track.dist || 0)} · {fmtSec(track.duration || 0)} · {pts.length} pts
                  </div>
                </div>

                <div className="track-item-actions">
                  <button
                    className="track-action-btn"
                    onClick={() => onFitTrack(track)}
                    title="Fit map to track"
                  >
                    <Maximize size={14} />
                  </button>
                  <button
                    className="track-action-btn danger"
                    onClick={() => onDelete(track.id)}
                    title="Delete track"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
