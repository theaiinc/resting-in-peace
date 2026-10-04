import { useState, useEffect, useCallback } from 'react'
import * as db from '../lib/db'

export function useTracks() {
  const [tracks, setTracks] = useState([])

  const fetchTracks = useCallback(async () => {
    try {
      const data = await db.getAll('tracks')
      data.sort((a, b) => b.created_at.localeCompare(a.created_at))
      setTracks(data)
    } catch (err) {
      console.error('fetchTracks error:', err)
    }
  }, [])

  useEffect(() => {
    fetchTracks()
  }, [fetchTracks])

  const addTrack = useCallback(async (track) => {
    try {
      const data = {
        dist: 0,
        duration: 0,
        pts: [],
        ...track,
        id: db.newId(),
        created_at: new Date().toISOString(),
      }
      await db.put('tracks', data)
      setTracks(prev => [data, ...prev])
      return data
    } catch (err) {
      console.error('addTrack error:', err)
      return null
    }
  }, [])

  const deleteTrack = useCallback(async (id) => {
    try {
      await db.remove('tracks', id)
      setTracks(prev => prev.filter(t => t.id !== id))
      return true
    } catch (err) {
      console.error('deleteTrack error:', err)
      return false
    }
  }, [])

  return { tracks, addTrack, deleteTrack }
}
