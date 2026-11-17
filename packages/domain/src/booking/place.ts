import type { BookingState } from './states'

/**
 * Feature 022, the place (research R15): the client's pin stays private until a booking is confirmed;
 * creators get the area, the emirate and the centre of the pin's grid cell (FR-005b).
 */

/** Grid cell size in degrees (about 2 km). */
const CELL = 0.02

const round = (n: number, digits: number) => Number(n.toFixed(digits))

/** The centre of the 0.02° cell that holds the pin: every pin in the cell maps here. */
export function snapPublic(lat: number, lng: number): { publicLat: number; publicLng: number } {
  const centre = (value: number) => round((Math.floor(value / CELL) + 0.5) * CELL, 5)
  return { publicLat: round(centre(lat), 2), publicLng: round(centre(lng), 2) }
}

export interface Point {
  lat: number
  lng: number
}

/** Straight-line distance in whole kilometres (haversine). */
export function distanceKm(from: Point, to: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(to.lat - from.lat)
  const dLng = rad(to.lng - from.lng)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

/**
 * A quick bounds check before reverse geocoding: the UAE's mainland and coast. The server still asks the
 * map provider which emirate the pin is in; this only rejects pins that are obviously elsewhere.
 */
export function insideUae(lat: number, lng: number): boolean {
  if (lat < 22.6 || lat > 26.1 || lng < 51.5 || lng > 56.4) return false
  // The Qatar peninsula and the sea north-west of Abu Dhabi.
  if (lng < 52.0 && lat > 24.3) return false
  // Oman's Musandam tip and northern coast.
  if (lat > 25.65 && lng > 56.05) return false
  return true
}

export interface BriefPlace {
  lat: number | null
  lng: number | null
  address: string | null
  area: string
  emirateId: string
  publicLat: number | null
  publicLng: number | null
}

export interface CreatorPlace {
  area: string
  emirateId: string
  publicLat: number | null
  publicLng: number | null
  distanceKm: number | null
  lat?: number
  lng?: number
  address?: string
}

const BOOKED: ReadonlySet<BookingState> = new Set(['confirmed', 'paid', 'scheduled', 'delivered', 'completed'])

/** What a creator may see of the place, given their starting point and the booking's state (FR-005b). */
export function placeForCreator(place: BriefPlace, base: Point | null, bookingState: BookingState | null): CreatorPlace {
  const hasPoint = place.publicLat !== null && place.publicLng !== null
  const seen: CreatorPlace = {
    area: place.area,
    emirateId: place.emirateId,
    publicLat: place.publicLat,
    publicLng: place.publicLng,
    distanceKm: hasPoint && base ? distanceKm(base, { lat: place.publicLat as number, lng: place.publicLng as number }) : null,
  }
  if (bookingState && BOOKED.has(bookingState) && place.lat !== null && place.lng !== null) {
    return { ...seen, lat: place.lat, lng: place.lng, address: place.address ?? '' }
  }
  return seen
}
