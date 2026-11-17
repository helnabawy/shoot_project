'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import type { CircleMarker, Map as LeafletMap } from 'leaflet'

/** The whole country, until the brief's emirate is found. */
const UAE: [number, number] = [24.6, 54.9]

/**
 * 022 (board 57): the map of the place step. OpenStreetMap tiles through Leaflet, loaded only when the place step
 * shows. A tap or click drops the pin; the server then reads its area and emirate. The pin is the client's own and
 * is never shown to creators.
 */
export default function PlaceMap({
  pin,
  focus,
  label,
  onPick,
}: {
  pin: { lat: number; lng: number } | null
  /** Where to open before a place is marked: the brief's emirate, found by its name. */
  focus?: { lat: number; lng: number } | null
  label: string
  onPick: (lat: number, lng: number) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<LeafletMap | null>(null)
  const marker = useRef<CircleMarker | null>(null)
  const pick = useRef(onPick)
  useEffect(() => {
    pick.current = onPick
  }, [onPick])

  useEffect(() => {
    let alive = true
    void import('leaflet').then((L) => {
      if (!alive || !box.current || map.current) return
      const start = pin ? ([pin.lat, pin.lng] as [number, number]) : focus ? ([focus.lat, focus.lng] as [number, number]) : UAE
      map.current = L.map(box.current, { center: start, zoom: pin ? 15 : focus ? 11 : 7, attributionControl: true })
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map.current)
      map.current.on('click', (e) => pick.current(e.latlng.lat, e.latlng.lng))
    })
    return () => {
      alive = false
      map.current?.remove()
      map.current = null
      marker.current = null
    }
    // The map is made once; the pin moves below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void import('leaflet').then((L) => {
      const m = map.current
      if (!m) return
      if (!pin) {
        marker.current?.remove()
        marker.current = null
        return
      }
      const at: [number, number] = [pin.lat, pin.lng]
      if (marker.current) marker.current.setLatLng(at)
      else marker.current = L.circleMarker(at, { radius: 9, color: '#ffffff', weight: 3, fillColor: '#e0141a', fillOpacity: 1 }).addTo(m)
      m.setView(at, Math.max(m.getZoom(), 15))
    })
  }, [pin])

  // The emirate is found after the map opens: move there unless a place is already marked.
  useEffect(() => {
    if (!pin && focus) map.current?.setView([focus.lat, focus.lng], 11)
    // Only a new focus moves the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.lat, focus?.lng])

  return <div ref={box} role="application" aria-label={label} data-testid="place-map" className="h-56 w-full overflow-hidden rounded-[12px] border border-hair" />
}
