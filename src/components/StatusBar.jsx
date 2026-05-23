import { fmtSec, fmtDist, haversine } from '../utils/geo'

export function StatusBar({ gps, onStopTrack }) {
  const { motionState, recording, currentTrack, status } = gps

  const trackDist = currentTrack.length > 1
    ? currentTrack.reduce((acc, pt, i) => {
        if (i === 0) return 0
        const prev = currentTrack[i - 1]
        return acc + haversine(prev.lat, prev.lng, pt.lat, pt.lng)
      }, 0)
    : 0

  const trackDurSec = currentTrack.length > 1
    ? Math.round((currentTrack[currentTrack.length - 1].t - currentTrack[0].t) / 1000)
    : 0

  const motionIcon = {
    idle: '🧍',
    walking: '🚶',
    vehicle: '🚗'
  }[motionState] || '📍'

  return (
    <div className="status-bar">
      <span className="status-icon">{motionIcon}</span>
      <span className="status-text">{status}</span>
      {recording && (
        <span className="rec-indicator">
          ● REC {fmtDist(trackDist)} {fmtSec(trackDurSec)}
        </span>
      )}
      {recording && (
        <button className="stop-track-btn" onClick={onStopTrack}>
          ■ Save Track
        </button>
      )}
    </div>
  )
}
