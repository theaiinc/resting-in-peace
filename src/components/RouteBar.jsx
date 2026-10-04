import { haversine, fmtDist } from '../utils/geo'
import { ChevronRight, X } from 'lucide-react'

export function RouteBar({ routeIds, places, onRemoveFromRoute, onClearRoute }) {
  if (routeIds.length === 0) return null

  const routePlaces = routeIds
    .map(id => places.find(p => p.id === id))
    .filter(Boolean)

  // Compute total route distance
  let totalDist = 0
  for (let i = 1; i < routePlaces.length; i++) {
    const a = routePlaces[i - 1]
    const b = routePlaces[i]
    totalDist += haversine(a.lat, a.lng, b.lat, b.lng)
  }

  return (
    <div className="route-bar">
      <span className="route-bar-label">Route:</span>
      <div className="route-places">
        {routePlaces.map((p, i) => (
          <div key={p.id} className="route-place-chip">
            {i > 0 && <ChevronRight size={12} style={{ color: 'var(--text2)', marginRight: 2 }} />}
            <span>{p.name || 'Pin'}</span>
            <button
              onClick={() => onRemoveFromRoute(p.id)}
              title="Remove from route"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      {routePlaces.length > 1 && (
        <span className="route-dist">{fmtDist(totalDist)}</span>
      )}
      <button className="route-clear-btn" onClick={onClearRoute} title="Clear route">
        Clear
      </button>
    </div>
  )
}
