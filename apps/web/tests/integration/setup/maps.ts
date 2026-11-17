import type { MapsProvider } from '@/modules/maps/providers'

/**
 * Feature 022 test maps provider (T070): no network. West of 54.9° E is Abu Dhabi, east of it Dubai; a point
 * north of 24.8° N and west of 54.2° E is open sea (not reachable). Search knows one place, Yas Marina Circuit.
 */
export const YAS = { lat: 24.4672, lng: 54.6031 }
export const SEA = { lat: 24.9, lng: 53.9 }
export const DOHA = { lat: 25.2854, lng: 51.531 }
export const DOWNTOWN = { lat: 25.1972, lng: 55.2744 }

export const fakeMaps: MapsProvider = {
  name: 'fake',
  async reverse(lat, lng) {
    if (lat > 24.8 && lng < 54.2) return { area: '', emirateName: '', address: '', reachable: false }
    return lng < 54.9
      ? { area: 'Yas Island', emirateName: 'Abu Dhabi', address: 'Yas Marina Circuit, Yas Island, Abu Dhabi', reachable: true }
      : { area: 'Downtown Dubai', emirateName: 'Dubai', address: 'Boulevard, Downtown Dubai', reachable: true }
  },
  async autocomplete(q) {
    return /yas/i.test(q) ? [{ placeId: 'yas-marina', main: 'Yas Marina Circuit', secondary: 'Yas Island, Abu Dhabi' }] : []
  },
  async details(placeId) {
    return placeId === 'yas-marina' ? YAS : null
  },
  staticMapUrl: (lat, lng) => `https://maps.example.test/static?center=${lat},${lng}`,
}
