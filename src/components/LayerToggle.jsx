import { Satellite, Map as MapIcon } from 'lucide-react'

export function LayerToggle({ activeLayer, onToggle }) {
  return (
    <div className="layer-toggle">
      <button
        className={`layer-btn ${activeLayer === 'sat' ? 'active' : ''}`}
        onClick={() => onToggle('sat')}
        title="Satellite"
      >
        <Satellite size={18} />
      </button>
      <button
        className={`layer-btn ${activeLayer === 'street' ? 'active' : ''}`}
        onClick={() => onToggle('street')}
        title="Street map"
      >
        <MapIcon size={18} />
      </button>
    </div>
  )
}
