import { Plus, Minus, LocateFixed } from 'lucide-react'

export function MapControls({ onZoomIn, onZoomOut, onLocate }) {
  return (
    <div className="map-controls">
      <button className="map-ctrl-btn" onClick={onZoomIn} title="Zoom in"><Plus size={18} /></button>
      <button className="map-ctrl-btn" onClick={onZoomOut} title="Zoom out"><Minus size={18} /></button>
      <button className="map-ctrl-btn" onClick={onLocate} title="My location"><LocateFixed size={18} /></button>
    </div>
  )
}
