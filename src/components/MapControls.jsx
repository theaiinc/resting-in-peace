export function MapControls({ onZoomIn, onZoomOut, onLocate }) {
  return (
    <div className="map-controls">
      <button className="map-ctrl-btn" onClick={onZoomIn} title="Zoom in">＋</button>
      <button className="map-ctrl-btn" onClick={onZoomOut} title="Zoom out">－</button>
      <button className="map-ctrl-btn" onClick={onLocate} title="My location">◎</button>
    </div>
  )
}
