import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

// Metric square grid anchored to fixed lat/lng lines, so a grave always
// falls in the same cell regardless of zoom or pan.

// Reference latitude for converting meters to degrees of longitude
// (the cemetery; scale drift is negligible within a few kilometers).
const REF_LAT = 15.879
const M_PER_DEG_LAT = 111320
const M_PER_DEG_LNG = 111320 * Math.cos((REF_LAT * Math.PI) / 180)

const STEPS_M = [1, 2, 5, 10, 20, 50, 100]
const MIN_CELL_PX = 16
export const GRID_MIN_ZOOM = 16
const MAJOR_EVERY = 5

// Smallest "nice" cell size that is still at least MIN_CELL_PX on screen
export function gridStepMeters(zoom) {
  const metersPerPx = (156543.03392 * Math.cos((REF_LAT * Math.PI) / 180)) / 2 ** zoom
  return STEPS_M.find(m => m / metersPerPx >= MIN_CELL_PX) ?? STEPS_M[STEPS_M.length - 1]
}

const MetricGrid = L.GridLayer.extend({
  createTile(coords) {
    const tile = document.createElement('canvas')
    const size = this.getTileSize()
    const dpr = window.devicePixelRatio || 1
    tile.width = size.x * dpr
    tile.height = size.y * dpr
    const ctx = tile.getContext('2d')
    ctx.scale(dpr, dpr)

    const map = this._map
    const z = coords.z
    const step = gridStepMeters(z)
    const dLat = step / M_PER_DEG_LAT
    const dLng = step / M_PER_DEG_LNG

    // Tile bounds in global pixels and degrees
    const nw = coords.scaleBy(size)
    const se = nw.add(size)
    const nwLL = map.unproject(nw, z)
    const seLL = map.unproject(se, z)

    const { color, majorColor } = this.options

    // Vertical lines (constant longitude)
    for (let i = Math.ceil(nwLL.lng / dLng); i * dLng <= seLL.lng; i++) {
      const x = map.project([nwLL.lat, i * dLng], z).x - nw.x
      const major = i % MAJOR_EVERY === 0
      ctx.strokeStyle = major ? majorColor : color
      ctx.lineWidth = major ? 1.25 : 0.75
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, size.y)
      ctx.stroke()
    }

    // Horizontal lines (constant latitude)
    for (let j = Math.ceil(seLL.lat / dLat); j * dLat <= nwLL.lat; j++) {
      const y = map.project([j * dLat, nwLL.lng], z).y - nw.y
      const major = j % MAJOR_EVERY === 0
      ctx.strokeStyle = major ? majorColor : color
      ctx.lineWidth = major ? 1.25 : 0.75
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(size.x, y)
      ctx.stroke()
    }

    return tile
  },
})

export function GridOverlay({ dark }) {
  const map = useMap()

  useEffect(() => {
    const layer = new MetricGrid({
      minZoom: GRID_MIN_ZOOM,
      zIndex: 5,
      color: dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.28)',
      majorColor: dark ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.6)',
    })
    layer.addTo(map)
    return () => { layer.remove() }
  }, [map, dark])

  return null
}
