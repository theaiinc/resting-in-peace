/**
 * Parse a "lat, lng" string into { lat, lng } or null
 */
export function parseCoords(s) {
  if (!s) return null
  const parts = s.split(',').map(p => p.trim())
  if (parts.length !== 2) return null
  const lat = parseFloat(parts[0])
  const lng = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

/**
 * Haversine distance in kilometers between two lat/lng points
 */
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Format seconds into "m:ss"
 */
export function fmtSec(s) {
  const mins = Math.floor(s / 60)
  const secs = Math.floor(s % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format kilometers as "Xm" or "X.XXkm"
 */
export function fmtDist(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`
  return `${km.toFixed(2)}km`
}
