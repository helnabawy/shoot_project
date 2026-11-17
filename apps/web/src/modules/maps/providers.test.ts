import { afterEach, describe, expect, it, vi } from 'vitest'
import { mapsProviderOf } from '@/shared/lib/env'
import { osmProvider, pointOfOsmId, readNominatim, readPhoton } from './providers'

const yas = {
  display_name: 'Yas Island, Abu Dhabi, Abu Dhabi Emirate, United Arab Emirates',
  address: { residential: 'Yas Island', suburb: 'Yas Island', city: 'Abu Dhabi', state: 'Abu Dhabi Emirate', 'ISO3166-2-lvl4': 'AE-AZ', country: 'United Arab Emirates', country_code: 'ae' },
}
const photon = {
  features: [
    { geometry: { coordinates: [54.6058654, 24.4722771] }, properties: { name: 'Yas Marina Circuit', city: 'Yas Island', district: 'Yas Island', state: 'Abu Dhabi', countrycode: 'AE' } },
    { geometry: { coordinates: [51.53, 25.28] }, properties: { name: 'Doha', state: 'Doha', countrycode: 'QA' } },
    { geometry: { coordinates: [55.27, 25.19] }, properties: { street: 'Sheikh Zayed Road', housenumber: '1', city: 'Dubai', state: 'Dubai', countrycode: 'AE' } },
  ],
}

describe('OF-US1-S4 OpenStreetMap as the maps provider', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads the emirate from the region code and the area from the address', () => {
    expect(readNominatim(yas)).toEqual({ area: 'Yas Island', emirateName: 'Abu Dhabi', address: yas.display_name, reachable: true })
    expect(readNominatim({ ...yas, address: { ...yas.address, suburb: undefined, residential: undefined } })?.area).toBe('Abu Dhabi')
    expect(readNominatim({ address: { 'ISO3166-2-lvl4': 'AE-DU', country_code: 'ae' } })).toMatchObject({ area: 'Dubai', emirateName: 'Dubai', address: '' })
  })

  it('the sea, another country or an unknown region is not a place we serve', () => {
    expect(readNominatim({ error: 'Unable to geocode' })).toBeNull()
    expect(readNominatim({ address: { 'ISO3166-2-lvl4': 'QA-DA', country_code: 'qa' } })).toBeNull()
    expect(readNominatim({ address: { 'ISO3166-2-lvl4': 'AE-AZ', country_code: 'om' } })).toBeNull()
    expect(readNominatim(null)).toBeNull()
  })

  it('search keeps places in the UAE, names them, and carries the point in the id', () => {
    const rows = readPhoton(photon as never)
    expect(rows).toEqual([
      { placeId: 'osm:24.472277,54.605865', main: 'Yas Marina Circuit', secondary: 'Yas Island, Abu Dhabi' },
      { placeId: 'osm:25.190000,55.270000', main: '1 Sheikh Zayed Road', secondary: 'Dubai, Dubai' },
    ])
    expect(readPhoton(null)).toEqual([])
  })

  it('a picked id gives its point back; anything else is refused', () => {
    expect(pointOfOsmId('osm:24.472277,54.605865')).toEqual({ lat: 24.472277, lng: 54.605865 })
    expect(pointOfOsmId('osm:99.1,54')).toBeNull()
    expect(pointOfOsmId('ChIJ-google-id')).toBeNull()
    expect(pointOfOsmId('osm:24,54;drop')).toBeNull()
  })

  it('calls Photon and Nominatim with an identifying User-Agent and the right language, spacing Nominatim calls', async () => {
    const calls: { url: string; ua: string | null; at: number }[] = []
    vi.stubGlobal('fetch', async (url: string, init: { headers: Record<string, string> }) => {
      calls.push({ url, ua: init.headers['User-Agent'] ?? null, at: Date.now() })
      return new Response(JSON.stringify(url.includes('/reverse') ? yas : photon), { status: 200 })
    })
    const maps = osmProvider({ userAgent: 'Shoot/1.0 (+http://localhost:3022)', minGapMs: 120 })
    expect(maps.name).toBe('osm')
    expect((await maps.autocomplete('yas marina', 'session', 'en'))[0]?.main).toBe('Yas Marina Circuit')
    expect(calls[0]!.url).toContain('photon.komoot.io/api/?q=yas%20marina')
    expect(calls[0]!.url).toContain('bbox=51.5,22.6,56.4,26.1')
    await maps.autocomplete('ياس', 'session', 'ar')
    expect(calls[1]!.url).toContain('lang=default')
    expect(await maps.details('osm:24.472277,54.605865', 'session', 'en')).toEqual({ lat: 24.472277, lng: 54.605865 })
    expect(calls).toHaveLength(2) // picking needs no call
    await maps.reverse(24.4672, 54.6031, 'ar')
    await maps.reverse(24.4672, 54.6031, 'en')
    const reverses = calls.filter((c) => c.url.includes('/reverse'))
    expect(reverses[0]!.url).toContain('accept-language=ar')
    expect(reverses[1]!.url).toContain('accept-language=en')
    expect(reverses[1]!.at - reverses[0]!.at).toBeGreaterThanOrEqual(100)
    expect(calls.every((c) => c.ua === 'Shoot/1.0 (+http://localhost:3022)')).toBe(true)
    expect(maps.staticMapUrl(24.4, 54.6, 'en')).toBeNull()
  })

  it('a service that is down or answers an error is no result, not a crash', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    const maps = osmProvider({ userAgent: 'x', minGapMs: 0, nominatimUrl: 'https://nominatim.example.test/', photonUrl: 'https://photon.example.test' })
    expect(await maps.autocomplete('yas', 's', 'en')).toEqual([])
    expect(await maps.reverse(24.4, 54.6, 'en')).toBeNull()
    vi.stubGlobal('fetch', async () => new Response('busy', { status: 503 }))
    expect(await maps.reverse(24.4, 54.6, 'en')).toBeNull()
  })

  it('MAPS_PROVIDER=osm needs no key; unset with a Google key stays Google', () => {
    expect(mapsProviderOf({ MAPS_PROVIDER: 'osm' })).toBe('osm')
    expect(mapsProviderOf({ GOOGLE_MAPS_SERVER_KEY: 'k' })).toBe('google')
    expect(mapsProviderOf({})).toBe('off')
  })
})
