import { describe, expect, it } from 'vitest'
import { distanceKm, insideUae, placeForCreator, snapPublic, type BriefPlace } from './place'

const yas: BriefPlace = {
  lat: 24.4672,
  lng: 54.6031,
  address: 'Yas Marina Circuit, Yas Island, Abu Dhabi',
  area: 'Yas Island',
  emirateId: 'auh',
  ...snapPublic(24.4672, 54.6031),
}

describe('OF-SC-008 the public point', () => {
  it('is the centre of the pin cell, the same for every pin in it, never the pin', () => {
    const p = snapPublic(24.4672, 54.6031)
    expect(p).toEqual({ publicLat: 24.47, publicLng: 54.61 })
    expect(snapPublic(24.4601, 54.6199)).toEqual(p)
    expect(p.publicLat).not.toBe(24.4672)
  })

  it('works for negative coordinates', () => {
    expect(snapPublic(-0.001, -0.001)).toEqual({ publicLat: -0.01, publicLng: -0.01 })
  })
})

describe('distance', () => {
  it('is whole kilometres, straight line', () => {
    expect(distanceKm({ lat: 24.4672, lng: 54.6031 }, { lat: 24.4672, lng: 54.6031 })).toBe(0)
    expect(distanceKm({ lat: 24.4539, lng: 54.3773 }, { lat: 24.4672, lng: 54.6031 })).toBe(23)
  })
})

describe('OF-US1-S4 inside the UAE', () => {
  it('accepts the emirates and refuses places outside', () => {
    expect(insideUae(24.4672, 54.6031)).toBe(true)
    expect(insideUae(25.2048, 55.2708)).toBe(true)
    expect(insideUae(25.2854, 51.531)).toBe(false)
    expect(insideUae(23.588, 58.3829)).toBe(false)
  })
})

describe('OF-US2-S1 what a creator sees', () => {
  const base = { lat: 24.4999, lng: 54.4, area: 'Al Reem Island' }

  it('before confirmation: area, emirate, public point and distance from the public point', () => {
    const seen = placeForCreator(yas, base, 'quoted')
    expect(seen).toEqual({ area: 'Yas Island', emirateId: 'auh', publicLat: 24.47, publicLng: 54.61, distanceKm: 22 })
    expect(JSON.stringify(seen)).not.toContain('24.4672')
    expect(seen).not.toHaveProperty('address')
  })

  it('without a starting point there is no distance', () => {
    expect(placeForCreator(yas, null, null).distanceKm).toBeNull()
  })

  it('OF-US2-S1b from confirmation on: the exact pin and address', () => {
    for (const state of ['confirmed', 'paid', 'scheduled', 'delivered', 'completed'] as const) {
      expect(placeForCreator(yas, base, state)).toMatchObject({ lat: 24.4672, lng: 54.6031, address: yas.address })
    }
    expect(placeForCreator(yas, base, 'accepted')).not.toHaveProperty('lat')
  })

  it('a fallback place without a pin has no point or distance', () => {
    const typed: BriefPlace = { lat: null, lng: null, address: null, area: 'Yas Island', emirateId: 'auh', publicLat: null, publicLng: null }
    expect(placeForCreator(typed, base, 'confirmed')).toEqual({ area: 'Yas Island', emirateId: 'auh', publicLat: null, publicLng: null, distanceKm: null })
  })
})
