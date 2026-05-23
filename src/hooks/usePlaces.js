import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Demo data seeded when Supabase has 0 places
const DEMO_PLACES = [
  { lat: 15.87900, lng: 108.33500, name: 'Main Gate', brief: '' },
  { lat: 15.87950, lng: 108.33580, name: 'Cemetery Office', brief: '' },
  { lat: 15.88010, lng: 108.33640, name: 'Nguyễn Văn An', brief: 'Born 12 March 1938 · Passed 4 January 2001\nBeloved husband, father of three, and retired schoolteacher. Known for his quiet kindness and love of gardening.' },
  { lat: 15.87980, lng: 108.33620, name: 'Trần Thị Bình', brief: 'Born 7 July 1942 · Passed 18 August 2015\nDevoted wife and grandmother of eight. She made the best bánh xèo in the village.' },
  { lat: 15.88030, lng: 108.33660, name: 'Lê Minh Châu', brief: 'Born 1955 · Passed 2019 · Section B, Plot 03.' },
]

export function usePlaces() {
  const [places, setPlaces] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPlaces = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('places').select('*').order('created_at', { ascending: true })
    if (error) {
      console.error('fetchPlaces error:', error)
      setLoading(false)
      return
    }

    if (data.length === 0) {
      // Seed demo data
      const { data: seeded, error: seedErr } = await supabase
        .from('places')
        .insert(DEMO_PLACES)
        .select()
      if (seedErr) {
        console.error('seed error:', seedErr)
      } else {
        setPlaces(seeded)
      }
    } else {
      setPlaces(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPlaces()
  }, [fetchPlaces])

  const addPlace = useCallback(async (lat, lng, name = '', brief = '') => {
    const { data, error } = await supabase
      .from('places')
      .insert({ lat, lng, name, brief })
      .select()
      .single()
    if (error) {
      console.error('addPlace error:', error)
      return null
    }
    setPlaces(prev => [...prev, data])
    return data
  }, [])

  const updatePlace = useCallback(async (id, fields) => {
    const { data, error } = await supabase
      .from('places')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('updatePlace error:', error)
      return null
    }
    setPlaces(prev => prev.map(p => (p.id === id ? data : p)))
    return data
  }, [])

  const removePlace = useCallback(async (id) => {
    const { error } = await supabase.from('places').delete().eq('id', id)
    if (error) {
      console.error('removePlace error:', error)
      return false
    }
    setPlaces(prev => prev.filter(p => p.id !== id))
    return true
  }, [])

  const uploadAudio = useCallback(async (placeId, blob) => {
    const path = `audio/${placeId}.webm`
    const { error: upErr } = await supabase.storage
      .from('audio')
      .upload(path, blob, { contentType: 'audio/webm', upsert: true })
    if (upErr) {
      console.error('uploadAudio error:', upErr)
      return null
    }
    const { data: urlData } = supabase.storage.from('audio').getPublicUrl(path)
    const audioUrl = urlData.publicUrl
    const updated = await updatePlace(placeId, { audio_url: audioUrl })
    return updated ? audioUrl : null
  }, [updatePlace])

  const deleteAudio = useCallback(async (placeId) => {
    const path = `audio/${placeId}.webm`
    const { error } = await supabase.storage.from('audio').remove([path])
    if (error) {
      console.error('deleteAudio storage error:', error)
    }
    await updatePlace(placeId, { audio_url: null })
  }, [updatePlace])

  return { places, addPlace, updatePlace, removePlace, uploadAudio, deleteAudio, loading }
}
