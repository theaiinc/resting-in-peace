import { fmtDist, fmtSec, haversine } from '../utils/geo'

export function TrackBar({ currentTrack, onStop }) {
  if (!currentTrack || currentTrack.length === 0) return null

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

  return (
    <div className="track-bar">
      <span style={{ color: 'var(--accent)', fontWeight: 700, animation: 'pulse 1s infinite' }}>
        ● REC
      </span>
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>
        {fmtDist(trackDist)} · {fmtSec(trackDurSec)}
      </span>
      <div style={{ flex: 1 }} />
      <button className="stop-track-btn" onClick={onStop}>
        ■ Stop & Save
      </button>
    </div>
  )
}
