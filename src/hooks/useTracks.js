import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useTracks() {
  const [tracks, setTracks] = useState([])

  const fetchTracks = useCallback(async () => {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('fetchTracks error:', error)
      return
    }
    setTracks(data)
  }, [])

  useEffect(() => {
    fetchTracks()
  }, [fetchTracks])

  const addTrack = useCallback(async (track) => {
    const { data, error } = await supabase
      .from('tracks')
      .insert(track)
      .select()
      .single()
    if (error) {
      console.error('addTrack error:', error)
      return null
    }
    setTracks(prev => [data, ...prev])
    return data
  }, [])

  const deleteTrack = useCallback(async (id) => {
    const { error } = await supabase.from('tracks').delete().eq('id', id)
    if (error) {
      console.error('deleteTrack error:', error)
      return false
    }
    setTracks(prev => prev.filter(t => t.id !== id))
    return true
  }, [])

  return { tracks, addTrack, deleteTrack }
}
