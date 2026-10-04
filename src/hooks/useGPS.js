import { useState, useEffect, useRef, useCallback } from 'react'
import { haversine } from '../utils/geo'

// Speed thresholds (m/s)
const WALK_MIN = 0.5
const VEHICLE_MIN = 4.0
const DWELL_SECONDS = 30
const DWELL_RADIUS_M = 5

export function useGPS({ onDwellPin, onTrackFinished } = {}) {
  const [motionState, setMotionState] = useState('idle') // 'idle' | 'walking' | 'vehicle'
  const [recording, setRecording] = useState(false)
  const [currentTrack, setCurrentTrack] = useState([]) // [{lat,lng,t}]
  const [status, setStatus] = useState('GPS not started')
  const [position, setPosition] = useState(null) // {lat,lng,accuracy}

  const watchIdRef = useRef(null)
  const motionStateRef = useRef('idle')
  const recordingRef = useRef(false)
  const currentTrackRef = useRef([])
  const dwellStartRef = useRef(null)
  const dwellPosRef = useRef(null)
  const dwellPinDroppedRef = useRef(false)
  const onDwellPinRef = useRef(onDwellPin)
  const onTrackFinishedRef = useRef(onTrackFinished)

  useEffect(() => { onDwellPinRef.current = onDwellPin }, [onDwellPin])
  useEffect(() => { onTrackFinishedRef.current = onTrackFinished }, [onTrackFinished])

  const setMotionStateBoth = useCallback((s) => {
    motionStateRef.current = s
    setMotionState(s)
  }, [])

  const setRecordingBoth = useCallback((v) => {
    recordingRef.current = v
    setRecording(v)
  }, [])

  const stopRecording = useCallback(() => {
    const pts = currentTrackRef.current
    setRecordingBoth(false)
    currentTrackRef.current = []
    setCurrentTrack([])
    setMotionStateBoth('idle')
    if (pts.length > 1 && onTrackFinishedRef.current) {
      onTrackFinishedRef.current(pts)
    }
  }, [setRecordingBoth, setMotionStateBoth])

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus('GPS unavailable')
      return
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, speed, accuracy } = pos.coords
        const speedMs = speed !== null ? speed : 0
        const now = Date.now()
        setPosition({ lat, lng, accuracy })

        // Motion state machine
        let nextState = motionStateRef.current
        if (speedMs >= VEHICLE_MIN) {
          nextState = 'vehicle'
        } else if (speedMs >= WALK_MIN) {
          nextState = 'walking'
        } else {
          nextState = 'idle'
        }

        // Dwell detection (idle → auto-pin)
        if (nextState === 'idle') {
          if (!dwellPosRef.current) {
            dwellPosRef.current = { lat, lng }
            dwellStartRef.current = now
            dwellPinDroppedRef.current = false
          } else {
            const distM = haversine(lat, lng, dwellPosRef.current.lat, dwellPosRef.current.lng) * 1000
            if (distM > DWELL_RADIUS_M) {
              dwellPosRef.current = { lat, lng }
              dwellStartRef.current = now
              dwellPinDroppedRef.current = false
            } else {
              const dwellSecs = (now - dwellStartRef.current) / 1000
              if (dwellSecs >= DWELL_SECONDS && !dwellPinDroppedRef.current) {
                dwellPinDroppedRef.current = true
                if (onDwellPinRef.current) {
                  onDwellPinRef.current(lat, lng)
                }
              }
            }
          }
        } else {
          dwellPosRef.current = null
          dwellStartRef.current = null
          dwellPinDroppedRef.current = false
        }

        // Recording logic
        if (nextState === 'walking' && !recordingRef.current) {
          setRecordingBoth(true)
        }

        if (nextState === 'vehicle' && recordingRef.current) {
          // Pause recording while in vehicle — just stop pushing points
        }

        if (recordingRef.current && nextState === 'walking') {
          const pt = { lat, lng, t: now }
          currentTrackRef.current = [...currentTrackRef.current, pt]
          setCurrentTrack(prev => [...prev, pt])
        }

        setMotionStateBoth(nextState)

        const speedKmh = (speedMs * 3.6).toFixed(1)
        const accText = accuracy ? ` ±${Math.round(accuracy)}m` : ''
        setStatus(`${nextState} · ${speedKmh}km/h${accText}`)
      },
      (err) => {
        setStatus(`GPS error: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 15000
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [setMotionStateBoth, setRecordingBoth])

  return { motionState, recording, currentTrack, position, stopRecording, status }
}
