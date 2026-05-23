export function FABGroup({ open, onToggle, onGPS, onTap, onCoord, onTracks, tapMode }) {
  return (
    <div className={`fab-group ${open ? 'open' : ''}`}>
      {open && (
        <div className="fab-menu">
          <button className="fab-item" onClick={() => { onTracks(); onToggle() }}>
            🗂 Saved Tracks
          </button>
          <button
            className={`fab-item ${tapMode ? 'active' : ''}`}
            onClick={() => { onTap(); onToggle() }}
          >
            👆 Tap Map
          </button>
          <button className="fab-item" onClick={() => { onCoord(); onToggle() }}>
            🔢 Coordinates
          </button>
          <button className="fab-item" onClick={() => { onGPS(); onToggle() }}>
            📍 My Location
          </button>
        </div>
      )}
      <button className="fab" onClick={onToggle} title="Add place">
        {open ? '✕' : '＋'}
      </button>
    </div>
  )
}
