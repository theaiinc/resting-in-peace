import { useState, useEffect } from 'react'
import { Plus, Minus, LocateFixed, Expand, Shrink, Grid3x3 } from 'lucide-react'

// Fullscreen API with the webkit prefix for older Safari (iPad)
const root = typeof document !== 'undefined' ? document.documentElement : null
const fullscreenSupported = !!(root && (root.requestFullscreen || root.webkitRequestFullscreen))

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null
}

function toggleFullscreen() {
  if (fullscreenElement()) {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
  } else {
    const req = root.requestFullscreen || root.webkitRequestFullscreen
    Promise.resolve(req.call(root, { navigationUI: 'hide' })).catch(err => {
      console.warn('Fullscreen request failed:', err)
    })
  }
}

function useIsFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => fullscreenSupported && !!fullscreenElement())
  useEffect(() => {
    if (!fullscreenSupported) return
    const onChange = () => setIsFullscreen(!!fullscreenElement())
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])
  return isFullscreen
}

export function MapControls({ onZoomIn, onZoomOut, onLocate, following = false, showGrid = false, onToggleGrid }) {
  const isFullscreen = useIsFullscreen()

  return (
    <div className="map-controls">
      <button className="map-ctrl-btn" onClick={onZoomIn} title="Zoom in"><Plus size={18} /></button>
      <button className="map-ctrl-btn" onClick={onZoomOut} title="Zoom out"><Minus size={18} /></button>
      <button
        className={`map-ctrl-btn ${following ? 'active' : ''}`}
        onClick={onLocate}
        title={following ? 'Following your location' : 'Follow my location'}
      >
        <LocateFixed size={18} />
      </button>
      {onToggleGrid && (
        <button
          className={`map-ctrl-btn ${showGrid ? 'active' : ''}`}
          onClick={onToggleGrid}
          title={showGrid ? 'Hide grid' : 'Show grid'}
        >
          <Grid3x3 size={18} />
        </button>
      )}
      {fullscreenSupported && (
        <button
          className="map-ctrl-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Shrink size={18} /> : <Expand size={18} />}
        </button>
      )}
    </div>
  )
}
