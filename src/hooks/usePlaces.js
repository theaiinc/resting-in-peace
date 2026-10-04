import { useState, useEffect, useCallback, useRef } from 'react'
import * as db from '../lib/db'

// Seed data shipped as a static file, loaded when local storage has 0 places
const SEED_URL = `${import.meta.env.BASE_URL}data/places.json`
const SEEDED_KEY = 'rip:seeded'

function isSeeded() {
  try { return localStorage.getItem(SEEDED_KEY) === '1' } catch { return false }
}
function markSeeded() {
  try { localStorage.setItem(SEEDED_KEY, '1') } catch { /* ignore */ }
}

function makePlace(fields) {
  return {
    id: db.newId(),
    name: '',
    brief: '',
    has_audio: false,
    created_at: new Date().toISOString(),
    ...fields,
  }
}

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)
  // Object URLs for stored voice-note blobs, keyed by place id
  const audioUrls = useRef(new Map())

  const withAudioUrl = useCallback(async (place) => {
    if (!place.has_audio) return { ...place, audio_url: null }
    let url = audioUrls.current.get(place.id)
    if (!url) {
      const rec = await db.get('audio', place.id)
      if (!rec) return { ...place, audio_url: null }
      url = URL.createObjectURL(rec.blob)
      audioUrls.current.set(place.id, url)
    }
    return { ...place, audio_url: url }
  }, [])

  const revokeAudioUrl = (id) => {
    const url = audioUrls.current.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      audioUrls.current.delete(id)
    }
  }

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    try {
      let data = await db.getAll('places')
      if (data.length === 0 && !isSeeded()) {
        try {
          const res = await fetch(SEED_URL)
          const seed = res.ok ? await res.json() : []
          const base = Date.now()
          data = seed.map((p, i) =>
            makePlace({ ...p, created_at: new Date(base + i).toISOString() })
          )
          await Promise.all(data.map(p => db.put('places', p)))
          markSeeded()
        } catch (err) {
          console.error('seed error:', err)
        }
      }
      data.sort((a, b) => a.created_at.localeCompare(b.created_at))
      setPlaces(await Promise.all(data.map(withAudioUrl)))
    } catch (err) {
      console.error('fetchPlaces error:', err)
    }
    setLoading(false)
  }, [withAudioUrl])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  useEffect(() => {
    const urls = audioUrls.current
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [])

  const addPlace = useCallback(async (lat, lng, name = '', brief = '') => {
    try {
      const place = makePlace({ lat, lng, name, brief })
      await db.put('places', place)
      const data = { ...place, audio_url: null }
      setPlaces(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('addPlace error:', err)
      return null
    }
  }, [])

  const updatePlace = useCallback(async (id, fields) => {
    try {
      const existing = await db.get('places', id)
      if (!existing) return null
      // audio_url is derived at runtime and never persisted
      const { audio_url: _ignored, ...rest } = fields
      const record = { ...existing, ...rest }
      await db.put('places', record)
      const data = await withAudioUrl(record)
      setPlaces(prev => prev.map(p => (p.id === id ? data : p)))
      return data
    } catch (err) {
      console.error('updatePlace error:', err)
      return null
    }
  }, [withAudioUrl])

  const removePlace = useCallback(async (id) => {
    try {
      await db.remove('places', id)
      await db.remove('audio', id)
      revokeAudioUrl(id)
      setPlaces(prev => prev.filter(p => p.id !== id))
      return true
    } catch (err) {
      console.error('removePlace error:', err)
      return false
    }
  }, [])

  const uploadAudio = useCallback(async (placeId, blob) => {
    try {
      await db.put('audio', { id: placeId, blob })
      revokeAudioUrl(placeId)
      const updated = await updatePlace(placeId, { has_audio: true })
      return updated ? updated.audio_url : null
    } catch (err) {
      console.error('uploadAudio error:', err)
      return null
    }
  }, [updatePlace])

  const deleteAudio = useCallback(async (placeId) => {
    try {
      await db.remove('audio', placeId)
    } catch (err) {
      console.error('deleteAudio storage error:', err)
    }
    revokeAudioUrl(placeId)
    await updatePlace(placeId, { has_audio: false })
  }, [updatePlace])

  return { places, addPlace, updatePlace, removePlace, uploadAudio, deleteAudio, loading }
}
