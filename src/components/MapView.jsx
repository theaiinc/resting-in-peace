import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMapEvents,
  useMap
} from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { haversine } from '../utils/geo'
import { LayerToggle } from './LayerToggle'
import { MapControls } from './MapControls'

// Fix leaflet default icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Tile URLs
const TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
// Street tiles come from the same Esri server as satellite: OpenStreetMap's
// tile servers are unreachable or rate-limited on some mobile networks.
const TILE_STREET = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
// Esri has no imagery past z17 here and serves "Map data not yet available"
// tiles instead, so stop fetching there and let Leaflet upscale z17 tiles.
const SAT_MAX_NATIVE_ZOOM = 17
const STREET_MAX_NATIVE_ZOOM = 18
const MAP_MAX_ZOOM = 21
// Probe both Esri layers; the live map is used if either one responds
const TILE_PROBES = [
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/514/802',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/10/514/802',
]
const PROBE_TIMEOUT_MS = 10000

// Pin colors: the most recently added place stands out from older ones
const PIN_COLOR = '#533483'
const NEW_PIN_COLOR = '#e94560'

function newestPlaceId(places) {
  let newest = null
  for (const p of places) {
    if (!newest || (p.created_at || '') > (newest.created_at || '')) newest = p
  }
  return newest?.id ?? null
}

// Custom colored pin icon
function pinIcon(color = '#e94560') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  })
}

// Internal component to handle map events, expose map instance, and set mapApiRef
function MapEventHandler({ tapMode, onMapClick, onMapRef, mapApiRef, places }) {
  const map = useMap()

  useEffect(() => {
    if (onMapRef) onMapRef(map)
  }, [map, onMapRef])

  useEffect(() => {
    if (!mapApiRef) return
    mapApiRef.current = {
      jumpTo: (lat, lng, z) => map.setView([lat, lng], z || 18),
      fitAll: () => {
        if (!places.length) return
        if (places.length === 1) { map.setView([places[0].lat, places[0].lng], 18); return }
        const bounds = L.latLngBounds(places.map(p => [p.lat, p.lng]))
        map.fitBounds(bounds, { padding: [50, 50] })
      },
      fitBounds: (sw, ne) => map.fitBounds([sw, ne], { padding: [50, 50] }),
      zoomIn: () => map.zoomIn(),
      zoomOut: () => map.zoomOut(),
    }
  }, [map, mapApiRef, places])

  useMapEvents({
    click(e) {
      if (tapMode) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    }
  })

  return null
}

// Draggable marker wrapper
function DraggableMarker({ place, isNewest, onDragEnd, onClick }) {
  const markerRef = useRef(null)
  const icon = pinIcon(isNewest ? NEW_PIN_COLOR : PIN_COLOR)

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker) {
        const { lat, lng } = marker.getLatLng()
        onDragEnd(place.id, lat, lng)
      }
    },
    click() {
      onClick(place)
    }
  }

  return (
    <Marker
      ref={markerRef}
      position={[place.lat, place.lng]}
      icon={icon}
      draggable={true}
      eventHandlers={eventHandlers}
    />
  )
}

// Zoom/locate controller
function MapController({ zoomIn, zoomOut, locate, controlRef }) {
  const map = useMap()

  useEffect(() => {
    if (controlRef) {
      controlRef.current = { zoomIn: () => map.zoomIn(), zoomOut: () => map.zoomOut(), locate: () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(pos => {
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { duration: 1.2 })
          })
        }
      }}
    }
  }, [map, controlRef])

  return null
}

function LeafletMap({
  places,
  activeLayer,
  tapMode,
  routeIds,
  tracks,
  visibleTrackIds,
  currentTrack,
  onMapClick,
  onPlaceDragEnd,
  onPlaceClick,
  onLayerToggle,
  mapApiRef,
}) {
  const mapRef = useRef(null)
  const newestId = newestPlaceId(places)

  const handleMapRef = useCallback((map) => {
    mapRef.current = map
  }, [])

  const handleZoomIn = () => mapRef.current?.zoomIn()
  const handleZoomOut = () => mapRef.current?.zoomOut()
  const handleLocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { duration: 1.2 })
    })
  }

  // Build route polyline
  const routePlaces = routeIds
    .map(id => places.find(p => p.id === id))
    .filter(Boolean)
  const routePositions = routePlaces.map(p => [p.lat, p.lng])

  // Current recording track positions
  const currentTrackPositions = currentTrack.map(pt => [pt.lat, pt.lng])

  return (
    <div className="leaflet-map-wrap">
      <LayerToggle activeLayer={activeLayer} onToggle={onLayerToggle} />
      <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onLocate={handleLocate} />
      <MapContainer
        center={[15.879, 108.336]}
        zoom={17}
        maxZoom={MAP_MAX_ZOOM}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={true}
      >
        <MapEventHandler
          tapMode={tapMode}
          onMapClick={onMapClick}
          onMapRef={handleMapRef}
          mapApiRef={mapApiRef}
          places={places}
        />

        {activeLayer === 'sat' ? (
          <TileLayer
            url={TILE_SATELLITE}
            attribution='Tiles &copy; Esri'
            maxNativeZoom={SAT_MAX_NATIVE_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
          />
        ) : (
          <TileLayer
            url={TILE_STREET}
            attribution='Tiles &copy; Esri'
            maxNativeZoom={STREET_MAX_NATIVE_ZOOM}
            maxZoom={MAP_MAX_ZOOM}
          />
        )}

        {/* Place markers */}
        {places.map(place => (
          <DraggableMarker
            key={place.id}
            place={place}
            isNewest={place.id === newestId}
            onDragEnd={onPlaceDragEnd}
            onClick={onPlaceClick}
          />
        ))}

        {/* Route polyline */}
        {routePositions.length > 1 && (
          <Polyline
            positions={routePositions}
            pathOptions={{ color: '#e94560', weight: 3, dashArray: '6,6' }}
          />
        )}

        {/* Saved tracks */}
        {tracks
          .filter(t => visibleTrackIds.has(t.id))
          .map(t => {
            const pts = Array.isArray(t.pts) ? t.pts : []
            const positions = pts.map(pt => [pt.lat, pt.lng])
            return positions.length > 1 ? (
              <Polyline
                key={t.id}
                positions={positions}
                pathOptions={{ color: '#533483', weight: 3 }}
              />
            ) : null
          })}

        {/* Current recording track */}
        {currentTrackPositions.length > 1 && (
          <Polyline
            positions={currentTrackPositions}
            pathOptions={{ color: '#4CAF50', weight: 3 }}
          />
        )}
      </MapContainer>
    </div>
  )
}

// ===== Canvas Map (offline fallback) =====

const CANVAS_TILE_SIZE = 256
const DEFAULT_CENTER = { lat: 15.879, lng: 108.336 }
const DEFAULT_ZOOM = 17

function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom)
  const x = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  return { x, y }
}

function tileToLatLng(tx, ty, zoom) {
  const n = Math.pow(2, zoom)
  const lng = (tx / n) * 360 - 180
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n)))
  const lat = (latRad * 180) / Math.PI
  return { lat, lng }
}

function CanvasMap({
  places,
  tapMode,
  routeIds,
  tracks,
  visibleTrackIds,
  currentTrack,
  onMapClick,
  onPlaceDragEnd,
  onPlaceClick,
  onLayerToggle,
  activeLayer,
  mapApiRef,
}) {
  const canvasRef = useRef(null)
  const stateRef = useRef({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    dragging: false,
    dragStart: null,
    dragCenter: null,
    pinchDist: null,
    pinchZoom: null,
  })

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const { center, zoom } = stateRef.current

    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, W, H)

    // Draw grid
    const centerTile = latLngToTile(center.lat, center.lng, zoom)
    const originX = W / 2 - (centerTile.x % 1) * CANVAS_TILE_SIZE
    const originY = H / 2 - (centerTile.y % 1) * CANVAS_TILE_SIZE
    const tileX0 = Math.floor(centerTile.x) - Math.ceil(W / 2 / CANVAS_TILE_SIZE) - 1
    const tileY0 = Math.floor(centerTile.y) - Math.ceil(H / 2 / CANVAS_TILE_SIZE) - 1
    const tileX1 = Math.floor(centerTile.x) + Math.ceil(W / 2 / CANVAS_TILE_SIZE) + 1
    const tileY1 = Math.floor(centerTile.y) + Math.ceil(H / 2 / CANVAS_TILE_SIZE) + 1

    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.15)'

    for (let tx = tileX0; tx <= tileX1; tx++) {
      for (let ty = tileY0; ty <= tileY1; ty++) {
        const px = originX + (tx - Math.floor(centerTile.x)) * CANVAS_TILE_SIZE
        const py = originY + (ty - Math.floor(centerTile.y)) * CANVAS_TILE_SIZE
        ctx.strokeRect(px, py, CANVAS_TILE_SIZE, CANVAS_TILE_SIZE)
        const { lat, lng } = tileToLatLng(tx + 0.5, ty + 0.5, zoom)
        ctx.fillText(`${lat.toFixed(2)},${lng.toFixed(2)}`, px + 4, py + 14)
      }
    }

    // Helper: lat/lng to canvas pixel
    function project(lat, lng) {
      const t = latLngToTile(lat, lng, zoom)
      const px = originX + (t.x - Math.floor(centerTile.x)) * CANVAS_TILE_SIZE
      const py = originY + (t.y - Math.floor(centerTile.y)) * CANVAS_TILE_SIZE
      return { x: px, y: py }
    }

    // Draw saved tracks
    tracks.filter(t => visibleTrackIds.has(t.id)).forEach(t => {
      const pts = Array.isArray(t.pts) ? t.pts : []
      if (pts.length < 2) return
      ctx.strokeStyle = '#533483'
      ctx.lineWidth = 2
      ctx.beginPath()
      pts.forEach((pt, i) => {
        const { x, y } = project(pt.lat, pt.lng)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    })

    // Draw current track
    if (currentTrack.length > 1) {
      ctx.strokeStyle = '#4CAF50'
      ctx.lineWidth = 2
      ctx.beginPath()
      currentTrack.forEach((pt, i) => {
        const { x, y } = project(pt.lat, pt.lng)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // Draw route
    const routePlaces = routeIds.map(id => places.find(p => p.id === id)).filter(Boolean)
    if (routePlaces.length > 1) {
      ctx.strokeStyle = '#e94560'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      routePlaces.forEach((p, i) => {
        const { x, y } = project(p.lat, p.lng)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw place markers
    const newestId = newestPlaceId(places)
    places.forEach(place => {
      const { x, y } = project(place.lat, place.lng)
      ctx.beginPath()
      ctx.arc(x, y - 4, 8, 0, Math.PI * 2)
      ctx.fillStyle = place.id === newestId ? NEW_PIN_COLOR : PIN_COLOR
      ctx.fill()
      ctx.strokeStyle = 'white'
      ctx.lineWidth = 1.5
      ctx.stroke()
      if (place.name) {
        ctx.fillStyle = 'rgba(22,33,62,0.85)'
        const tw = ctx.measureText(place.name).width
        ctx.fillRect(x - tw / 2 - 3, y - 28, tw + 6, 14)
        ctx.fillStyle = '#eaeaea'
        ctx.font = '11px -apple-system, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(place.name, x, y - 17)
        ctx.textAlign = 'left'
      }
    })
  }, [places, routeIds, tracks, visibleTrackIds, currentTrack])

  // Expose map API to parent
  useEffect(() => {
    if (!mapApiRef) return
    mapApiRef.current = {
      jumpTo: (lat, lng, z) => {
        stateRef.current.center = { lat, lng }
        stateRef.current.zoom = z || 16
        redraw()
      },
      fitAll: () => {
        if (!places.length) return
        if (places.length === 1) {
          stateRef.current.center = { lat: places[0].lat, lng: places[0].lng }
          stateRef.current.zoom = 17
          redraw()
          return
        }
        const lats = places.map(p => p.lat)
        const lngs = places.map(p => p.lng)
        stateRef.current.center = {
          lat: (Math.max(...lats) + Math.min(...lats)) / 2,
          lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
        }
        stateRef.current.zoom = Math.min(17,
          Math.floor(Math.log2(360 / (Math.max(...lngs) - Math.min(...lngs) || 0.001))) - 1
        )
        redraw()
      },
      fitBounds: (sw, ne) => {
        stateRef.current.center = { lat: (sw[0] + ne[0]) / 2, lng: (sw[1] + ne[1]) / 2 }
        redraw()
      },
      zoomIn: () => { stateRef.current.zoom = Math.min(19, stateRef.current.zoom + 1); redraw() },
      zoomOut: () => { stateRef.current.zoom = Math.max(2, stateRef.current.zoom - 1); redraw() },
    }
  }, [mapApiRef, places, redraw])

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      redraw()
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [redraw])

  useEffect(() => { redraw() }, [redraw])

  // Unproject pixel to lat/lng
  const unproject = useCallback((px, py) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const { center, zoom } = stateRef.current
    const W = canvas.width
    const H = canvas.height
    const centerTile = latLngToTile(center.lat, center.lng, zoom)
    const originX = W / 2 - (centerTile.x % 1) * CANVAS_TILE_SIZE
    const originY = H / 2 - (centerTile.y % 1) * CANVAS_TILE_SIZE
    const tx = Math.floor(centerTile.x) + (px - originX) / CANVAS_TILE_SIZE
    const ty = Math.floor(centerTile.y) + (py - originY) / CANVAS_TILE_SIZE
    return tileToLatLng(tx, ty, zoom)
  }, [])

  const handleMouseDown = useCallback((e) => {
    const s = stateRef.current
    s.dragging = true
    s.dragStart = { x: e.clientX, y: e.clientY }
    s.dragCenter = { ...s.center }
  }, [])

  const handleMouseMove = useCallback((e) => {
    const s = stateRef.current
    if (!s.dragging) return
    const dx = e.clientX - s.dragStart.x
    const dy = e.clientY - s.dragStart.y
    const n = Math.pow(2, s.zoom)
    const degreesPerPixelLng = 360 / (n * CANVAS_TILE_SIZE)
    const latRad = (s.dragCenter.lat * Math.PI) / 180
    const degreesPerPixelLat = 360 / (n * CANVAS_TILE_SIZE) / Math.cos(latRad)
    s.center = {
      lat: s.dragCenter.lat + dy * degreesPerPixelLat,
      lng: s.dragCenter.lng - dx * degreesPerPixelLng,
    }
    redraw()
  }, [redraw])

  const handleMouseUp = useCallback((e) => {
    const s = stateRef.current
    if (!s.dragging) return
    s.dragging = false
    const dx = Math.abs(e.clientX - s.dragStart.x)
    const dy = Math.abs(e.clientY - s.dragStart.y)
    if (dx < 5 && dy < 5 && tapMode) {
      const rect = canvasRef.current.getBoundingClientRect()
      const coords = unproject(e.clientX - rect.left, e.clientY - rect.top)
      if (coords) onMapClick(coords.lat, coords.lng)
    }
  }, [tapMode, onMapClick, unproject])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const s = stateRef.current
    const delta = e.deltaY > 0 ? -1 : 1
    s.zoom = Math.max(2, Math.min(19, s.zoom + delta))
    redraw()
  }, [redraw])

  const handleTouchStart = useCallback((e) => {
    const s = stateRef.current
    if (e.touches.length === 1) {
      s.dragging = true
      s.dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      s.dragCenter = { ...s.center }
    } else if (e.touches.length === 2) {
      s.dragging = false
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      s.pinchDist = Math.sqrt(dx * dx + dy * dy)
      s.pinchZoom = s.zoom
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault()
    const s = stateRef.current
    if (e.touches.length === 1 && s.dragging) {
      const dx = e.touches[0].clientX - s.dragStart.x
      const dy = e.touches[0].clientY - s.dragStart.y
      const n = Math.pow(2, s.zoom)
      const degreesPerPixelLng = 360 / (n * CANVAS_TILE_SIZE)
      const latRad = (s.dragCenter.lat * Math.PI) / 180
      const degreesPerPixelLat = 360 / (n * CANVAS_TILE_SIZE) / Math.cos(latRad)
      s.center = {
        lat: s.dragCenter.lat + dy * degreesPerPixelLat,
        lng: s.dragCenter.lng - dx * degreesPerPixelLng,
      }
      redraw()
    } else if (e.touches.length === 2 && s.pinchDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ratio = dist / s.pinchDist
      s.zoom = Math.max(2, Math.min(19, s.pinchZoom + Math.log2(ratio)))
      redraw()
    }
  }, [redraw])

  const handleTouchEnd = useCallback((e) => {
    const s = stateRef.current
    if (e.changedTouches.length === 1 && s.dragging) {
      const dx = Math.abs(e.changedTouches[0].clientX - s.dragStart.x)
      const dy = Math.abs(e.changedTouches[0].clientY - s.dragStart.y)
      s.dragging = false
      if (dx < 8 && dy < 8 && tapMode) {
        const rect = canvasRef.current.getBoundingClientRect()
        const coords = unproject(
          e.changedTouches[0].clientX - rect.left,
          e.changedTouches[0].clientY - rect.top
        )
        if (coords) onMapClick(coords.lat, coords.lng)
      }
    }
    s.pinchDist = null
    s.pinchZoom = null
  }, [tapMode, onMapClick, unproject])

  const handleZoomIn = () => {
    stateRef.current.zoom = Math.min(19, stateRef.current.zoom + 1)
    redraw()
  }
  const handleZoomOut = () => {
    stateRef.current.zoom = Math.max(2, stateRef.current.zoom - 1)
    redraw()
  }
  const handleLocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      stateRef.current.center = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      stateRef.current.zoom = 16
      redraw()
    })
  }

  return (
    <div className="canvas-map-wrap">
      <MapControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onLocate={handleLocate} />
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    </div>
  )
}

// ===== Main MapView (probing + switching) =====

export function MapView(props) {
  const [mapMode, setMapMode] = useState('probing')

  useEffect(() => {
    let settled = false
    let failures = 0
    const settle = (mode) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      setMapMode(mode)
    }
    const timer = setTimeout(() => settle('canvas'), PROBE_TIMEOUT_MS)

    for (const url of TILE_PROBES) {
      const img = new Image()
      img.onload = () => settle('leaflet')
      img.onerror = () => {
        failures += 1
        if (failures === TILE_PROBES.length) settle('canvas')
      }
      img.src = url
    }

    return () => {
      settled = true
      clearTimeout(timer)
    }
  }, [])

  if (mapMode === 'probing') {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <div className="map-loading">Probing map tiles…</div>
      </div>
    )
  }

  if (mapMode === 'leaflet') {
    return <LeafletMap {...props} mapApiRef={props.mapApiRef} />
  }

  return <CanvasMap {...props} mapApiRef={props.mapApiRef} />
}
