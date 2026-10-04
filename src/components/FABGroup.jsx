import { Route, Pointer, Hash, LocateFixed, Plus, X } from 'lucide-react'

export function FABGroup({ open, onToggle, onGPS, onTap, onCoord, onTracks, tapMode }) {
  return (
    <div className={`fab-group ${open ? 'open' : ''}`}>
      {open && (
        <div className="fab-menu">
          <button className="fab-item" onClick={() => { onTracks(); onToggle() }}>
            <Route size={16} /> Saved Tracks
          </button>
          <button
            className={`fab-item ${tapMode ? 'active' : ''}`}
            onClick={() => { onTap(); onToggle() }}
          >
            <Pointer size={16} /> Tap Map
          </button>
          <button className="fab-item" onClick={() => { onCoord(); onToggle() }}>
            <Hash size={16} /> Coordinates
          </button>
          <button className="fab-item" onClick={() => { onGPS(); onToggle() }}>
            <LocateFixed size={16} /> My Location
          </button>
        </div>
      )}
      <button className="fab" onClick={onToggle} title="Add place">
        {open ? <X size={26} /> : <Plus size={26} />}
      </button>
    </div>
  )
}
