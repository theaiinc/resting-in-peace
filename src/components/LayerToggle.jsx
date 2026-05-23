export function LayerToggle({ activeLayer, onToggle }) {
  return (
    <div className="layer-toggle">
      <button
        className={`layer-btn ${activeLayer === 'sat' ? 'active' : ''}`}
        onClick={() => onToggle('sat')}
      >
        🛰️
      </button>
      <button
        className={`layer-btn ${activeLayer === 'street' ? 'active' : ''}`}
        onClick={() => onToggle('street')}
      >
        🗺️
      </button>
    </div>
  )
}
