import { useState } from 'react'
import { parseCoords } from '../utils/geo'
import { Search } from 'lucide-react'

export function TopBar({ placeCount, onFitAll, onSearch, onError }) {
  const [query, setQuery] = useState('')

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return
    const coords = parseCoords(query.trim())
    if (!coords) {
      onError?.('Use format: lat, lng')
      return
    }
    onSearch(coords)
    setQuery('')
  }

  return (
    <div className="top-bar">
      <div className="search-wrap">
        <span className="search-icon"><Search size={16} /></span>
        <input
          className="search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Coords: 15.8785, 108.3370 ↵"
        />
      </div>
      <div className="count-badge" onClick={onFitAll} title="Fit all places">
        {placeCount} {placeCount !== 1 ? 'places' : 'place'}
      </div>
    </div>
  )
}
