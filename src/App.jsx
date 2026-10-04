import { useState, useCallback, useRef } from 'react'
import { usePlaces } from './hooks/usePlaces'
import { useTracks } from './hooks/useTracks'
import { useGPS } from './hooks/useGPS'
import { haversine, fmtDist, fmtSec } from './utils/geo'

import { MapView } from './components/MapView'
import { TopBar } from './components/TopBar'
import { FABGroup } from './components/FABGroup'
import { StatusBar } from './components/StatusBar'
import { RouteBar } from './components/RouteBar'
import { TrackBar } from './components/TrackBar'
import { TracksPanel } from './components/TracksPanel'
import { PlaceSheet } from './components/PlaceSheet'
import { CoordModal } from './components/CoordModal'
import { Toast } from './components/Toast'
import { Pointer } from 'lucide-react'

export default function App() {
  // ===== UI state =====
  const [routeIds, setRouteIds] = useState([])
  const [activePlace, setActivePlace] = useState(null)
  const [fabOpen, setFabOpen] = useState(false)
  const [tapMode, setTapMode] = useState(false)
  const [activeLayer, setActiveLayer] = useState('sat')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [coordModalOpen, setCoordModalOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState(null)
  const [tracksPanelOpen, setTracksPanelOpen] = useState(false)
  const [visibleTrackIds, setVisibleTrackIds] = useState(new Set())

  // ===== Data hooks =====
  const {
    places,
    addPlace,
    updatePlace,
    removePlace,
    uploadAudio,
    deleteAudio,
    loading: placesLoading,
  } = usePlaces()

  const { tracks, addTrack, deleteTrack } = useTracks()

  // ===== Toast helper =====
  const showToast = useCallback((msg) => {
    setToastMsg(msg)
  }, [])

  // ===== GPS callbacks =====
  const handleDwellPin = useCallback(async (lat, lng) => {
    const place = await addPlace(lat, lng, 'Dwell Pin', 'Auto-placed after 30s idle')
    if (place) showToast('Dwell pin dropped!')
  }, [addPlace, showToast])

  const handleTrackFinished = useCallback(async (pts) => {
    if (pts.length < 2) return

    // Compute distance
    let dist = 0
    for (let i = 1; i < pts.length; i++) {
      dist += haversine(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng)
    }
    const duration = Math.round((pts[pts.length - 1].t - pts[0].t) / 1000)

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    const track = {
      name: `Walk ${dateStr} ${timeStr}`,
      pts,
      dist,
      duration,
      date: dateStr,
    }

    const saved = await addTrack(track)
    if (saved) {
      setVisibleTrackIds(prev => new Set([...prev, saved.id]))
      showToast(`Track saved: ${fmtDist(dist)} in ${fmtSec(duration)}`)
    }
  }, [addTrack, showToast])

  const gps = useGPS({
    onDwellPin: handleDwellPin,
    onTrackFinished: handleTrackFinished,
  })

  const mapApiRef = useRef(null)

  // ===== Place interactions =====
  const handleMapClick = useCallback(async (lat, lng) => {
    if (!tapMode) return
    setTapMode(false)
    const place = await addPlace(lat, lng, '', '')
    if (place) {
      setActivePlace(place)
      setSheetOpen(true)
      showToast('Pin dropped — add a name!')
    }
  }, [tapMode, addPlace, showToast])

  const handleGPSPin = useCallback(async () => {
    if (!navigator.geolocation) {
      showToast('GPS unavailable')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const place = await addPlace(pos.coords.latitude, pos.coords.longitude, '', '')
        if (place) {
          setActivePlace(place)
          setSheetOpen(true)
          showToast('Pin dropped at your location!')
        }
      },
      (err) => showToast(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [addPlace, showToast])

  const handleCoordPin = useCallback(async (lat, lng) => {
    const place = await addPlace(lat, lng, '', '')
    if (place) {
      mapApiRef.current?.jumpTo(lat, lng, 18)
      setActivePlace(place)
      setSheetOpen(true)
      showToast('Pin dropped!')
    }
  }, [addPlace, showToast])

  const handlePlaceClick = useCallback((place) => {
    setActivePlace(place)
    setSheetOpen(true)
  }, [])

  const handlePlaceDragEnd = useCallback(async (id, lat, lng) => {
    await updatePlace(id, { lat, lng })
    // Update activePlace if it's the dragged one
    setActivePlace(prev => prev && prev.id === id ? { ...prev, lat, lng } : prev)
  }, [updatePlace])

  const handlePlaceUpdate = useCallback(async (id, fields) => {
    const updated = await updatePlace(id, fields)
    if (updated) {
      setActivePlace(prev => prev && prev.id === id ? { ...prev, ...fields } : prev)
    }
    return updated
  }, [updatePlace])

  const handlePlaceRemove = useCallback(async (id) => {
    await removePlace(id)
    setRouteIds(prev => prev.filter(rid => rid !== id))
    setSheetOpen(false)
    setActivePlace(null)
  }, [removePlace])

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false)
    setActivePlace(null)
  }, [])

  // ===== Route =====
  const handleAddToRoute = useCallback((id) => {
    setRouteIds(prev => prev.includes(id) ? prev : [...prev, id])
    showToast('Added to route')
  }, [showToast])

  const handleRemoveFromRoute = useCallback((id) => {
    setRouteIds(prev => prev.filter(rid => rid !== id))
  }, [])

  const handleClearRoute = useCallback(() => {
    setRouteIds([])
  }, [])

  // ===== Tracks panel =====
  const handleToggleTrackVisible = useCallback((id) => {
    setVisibleTrackIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDeleteTrack = useCallback(async (id) => {
    await deleteTrack(id)
    setVisibleTrackIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    showToast('Track deleted')
  }, [deleteTrack, showToast])

  const handleFitTrack = useCallback((track) => {
    if (!track?.pts?.length) return
    const lats = track.pts.map(p => p.lat)
    const lngs = track.pts.map(p => p.lng)
    mapApiRef.current?.fitBounds(
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    )
    setTracksPanelOpen(false)
  }, [])

  const handleSearch = useCallback((coords) => {
    mapApiRef.current?.jumpTo(coords.lat, coords.lng, 18)
    showToast(`Jumped to ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`)
  }, [showToast])

  const handleFitAll = useCallback(() => {
    mapApiRef.current?.fitAll()
  }, [])

  // ===== Stop GPS track =====
  const handleStopTrack = useCallback(() => {
    gps.stopRecording()
  }, [gps])

  // ===== Layer toggle =====
  const handleLayerToggle = useCallback((layer) => {
    setActiveLayer(layer)
  }, [])

  return (
    <div className="app">
      <TopBar
        placeCount={places.length}
        onFitAll={handleFitAll}
        onSearch={handleSearch}
        onError={showToast}
      />

      <div className="map-container">
        <MapView
          places={places}
          activeLayer={activeLayer}
          tapMode={tapMode}
          routeIds={routeIds}
          tracks={tracks}
          visibleTrackIds={visibleTrackIds}
          currentTrack={gps.currentTrack}
          onMapClick={handleMapClick}
          onPlaceDragEnd={handlePlaceDragEnd}
          onPlaceClick={handlePlaceClick}
          onLayerToggle={handleLayerToggle}
          mapApiRef={mapApiRef}
        />

        {/* Tap mode banner */}
        {tapMode && (
          <div className="tap-mode-banner">
            <Pointer size={16} /> Tap map to place pin
          </div>
        )}

        <FABGroup
          open={fabOpen}
          onToggle={() => setFabOpen(o => !o)}
          onGPS={handleGPSPin}
          onTap={() => setTapMode(t => !t)}
          onCoord={() => setCoordModalOpen(true)}
          onTracks={() => setTracksPanelOpen(true)}
          tapMode={tapMode}
        />

        {/* Route bar overlaid at bottom of map */}
        {routeIds.length > 0 && (
          <RouteBar
            routeIds={routeIds}
            places={places}
            onRemoveFromRoute={handleRemoveFromRoute}
            onClearRoute={handleClearRoute}
          />
        )}

        {/* Track recording bar */}
        {gps.recording && (
          <TrackBar
            currentTrack={gps.currentTrack}
            onStop={handleStopTrack}
          />
        )}
      </div>

      <StatusBar gps={gps} onStopTrack={handleStopTrack} />

      {/* Place detail sheet */}
      {sheetOpen && activePlace && (
        <PlaceSheet
          place={activePlace}
          onClose={handleCloseSheet}
          onUpdate={handlePlaceUpdate}
          onRemove={handlePlaceRemove}
          onUploadAudio={uploadAudio}
          onDeleteAudio={deleteAudio}
          routeIds={routeIds}
          onAddToRoute={handleAddToRoute}
          onRemoveFromRoute={handleRemoveFromRoute}
          showToast={showToast}
        />
      )}

      {/* Coordinate entry modal */}
      {coordModalOpen && (
        <CoordModal
          onConfirm={handleCoordPin}
          onClose={() => setCoordModalOpen(false)}
        />
      )}

      {/* Tracks side panel */}
      {tracksPanelOpen && (
        <TracksPanel
          tracks={tracks}
          visibleTrackIds={visibleTrackIds}
          onToggleVisible={handleToggleTrackVisible}
          onFitTrack={handleFitTrack}
          onDelete={handleDeleteTrack}
          onClose={() => setTracksPanelOpen(false)}
        />
      )}

      {/* Toast notifications */}
      <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />
    </div>
  )
}
