import { createHmac } from 'node:crypto'
import { mapsProviderOf, type Env } from '@/shared/lib/env'

/**
 * The place (feature 022, research R15). Google over plain HTTP (no SDK); `off` when there are no keys, so
 * the place step falls back to the emirate list. Never log a pin, an address or a search text (G1).
 */

export interface ReverseResult {
  /** Neighbourhood or locality, in the request language. */
  area: string
  /** The emirate's name as Google returns it in English (matched to `locations.googleName`). */
  emirateName: string
  address: string
  /** The point is a road, building or place Google knows (not the sea or open desert). */
  reachable: boolean
}

export interface PlaceSuggestion {
  placeId: string
  main: string
  secondary: string
}

export interface MapsProvider {
  name: 'google' | 'osm' | 'off' | 'fake'
  reverse(lat: number, lng: number, language: string): Promise<ReverseResult | null>
  autocomplete(q: string, sessionToken: string, language: string): Promise<PlaceSuggestion[]>
  details(placeId: string, sessionToken: string, language: string): Promise<{ lat: number; lng: number } | null>
  /** A small signed map image of a public point with a circle around it; null without keys. */
  staticMapUrl(lat: number, lng: number, language: string): string | null
}

export const offProvider: MapsProvider = {
  name: 'off',
  reverse: async () => null,
  autocomplete: async () => [],
  details: async () => null,
  staticMapUrl: () => null,
}

type Component = { long_name: string; types: string[] }

const pick = (components: Component[], ...types: string[]) => types.map((t) => components.find((c) => c.types.includes(t))?.long_name).find(Boolean) ?? ''

/** Maps a Geocoding answer to the area and the emirate (exported for tests). */
export function readGeocode(results: { address_components: Component[]; formatted_address: string; types: string[] }[]): ReverseResult | null {
  const first = results[0]
  if (!first) return null
  const components = first.address_components
  const emirateName = pick(components, 'administrative_area_level_1')
  const country = components.find((c) => c.types.includes('country'))
  if (!emirateName || !country) return null
  return {
    area: pick(components, 'sublocality_level_1', 'sublocality', 'neighborhood', 'locality') || emirateName,
    emirateName,
    address: first.formatted_address,
    reachable: !first.types.includes('natural_feature') && !first.types.includes('plus_code'),
  }
}

/** Signs a Static Maps URL with the URL signing secret (HMAC-SHA1, URL-safe base64). Exported for tests. */
export function signUrl(pathAndQuery: string, secret: string): string {
  const key = Buffer.from(secret.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  const signature = createHmac('sha1', key).update(pathAndQuery).digest('base64').replace(/\+/g, '-').replace(/\//g, '_')
  return `${pathAndQuery}&signature=${signature}`
}

/** A 1.5 km circle drawn as a closed path of 24 points around the public point. */
function circlePath(lat: number, lng: number, km = 1.5): string {
  const points: string[] = []
  for (let i = 0; i <= 24; i += 1) {
    const angle = (i / 24) * 2 * Math.PI
    const dLat = (km / 111.32) * Math.cos(angle)
    const dLng = (km / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle)
    points.push(`${(lat + dLat).toFixed(5)},${(lng + dLng).toFixed(5)}`)
  }
  return points.join('|')
}

export function googleProvider(keys: { server: string; urlSecret?: string }): MapsProvider {
  const get = async (url: string) => {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as Record<string, unknown>
  }
  return {
    name: 'google',
    async reverse(lat, lng, language) {
      const json = await get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=${language}&key=${keys.server}`)
      if (!json || json.status !== 'OK') return null
      const english = language === 'en' ? json : await get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${keys.server}`)
      const local = readGeocode(json.results as never)
      const en = english ? readGeocode(english.results as never) : null
      return local && en ? { ...local, emirateName: en.emirateName } : null
    },
    async autocomplete(q, sessionToken, language) {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': keys.server },
        body: JSON.stringify({ input: q, sessionToken, languageCode: language, includedRegionCodes: ['ae'] }),
        cache: 'no-store',
      })
      if (!res.ok) return []
      const json = (await res.json()) as { suggestions?: { placePrediction?: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } } } }[] }
      return (json.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .slice(0, 5)
        .map((p) => ({ placeId: p.placeId, main: p.structuredFormat?.mainText?.text ?? '', secondary: p.structuredFormat?.secondaryText?.text ?? '' }))
    },
    async details(placeId, sessionToken, language) {
      const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}&languageCode=${language}`, {
        headers: { 'X-Goog-Api-Key': keys.server, 'X-Goog-FieldMask': 'location' },
        cache: 'no-store',
      })
      if (!res.ok) return null
      const json = (await res.json()) as { location?: { latitude: number; longitude: number } }
      return json.location ? { lat: json.location.latitude, lng: json.location.longitude } : null
    },
    staticMapUrl(lat, lng, language) {
      if (!keys.urlSecret) return null
      const path = `/maps/api/staticmap?size=168x128&scale=2&zoom=12&language=${language}&center=${lat},${lng}&path=color:0x0a60ff8c|weight:2|fillcolor:0x0a60ff24|${circlePath(lat, lng)}&key=${keys.server}`
      return `https://maps.googleapis.com${signUrl(path, keys.urlSecret)}`
    },
  }
}

/** The emirates by their ISO 3166-2 code (Nominatim's `ISO3166-2-lvl4`), as `locations.googleName` holds them. */
const EMIRATE_BY_ISO: Record<string, string> = {
  'AE-AZ': 'Abu Dhabi',
  'AE-DU': 'Dubai',
  'AE-SH': 'Sharjah',
  'AE-AJ': 'Ajman',
  'AE-UQ': 'Umm Al Quwain',
  'AE-RK': 'Ras Al Khaimah',
  'AE-FU': 'Fujairah',
}

type NominatimAddress = Record<string, string | undefined>

/** Maps a Nominatim reverse answer to the area and the emirate (exported for tests); null outside the emirates. */
export function readNominatim(json: { error?: string; display_name?: string; address?: NominatimAddress } | null): ReverseResult | null {
  if (!json || json.error || !json.address) return null
  const a = json.address
  const emirateName = EMIRATE_BY_ISO[a['ISO3166-2-lvl4'] ?? '']
  if (!emirateName || a.country_code !== 'ae') return null
  return {
    area: a.suburb || a.neighbourhood || a.quarter || a.city_district || a.residential || a.city || a.town || a.village || emirateName,
    emirateName,
    address: json.display_name ?? '',
    reachable: true,
  }
}

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: Record<string, string | undefined> }

/** Maps Photon search results to suggestions; the point travels in the id, so picking needs no second call. */
export function readPhoton(json: { features?: PhotonFeature[] } | null): PlaceSuggestion[] {
  return (json?.features ?? [])
    .filter((f) => f.properties?.countrycode === 'AE' && Array.isArray(f.geometry?.coordinates))
    .slice(0, 5)
    .map((f) => {
      const p = f.properties ?? {}
      const [lng, lat] = f.geometry!.coordinates!
      const main = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.district || p.city || ''
      const secondary = [p.district !== main ? p.district : undefined, p.city !== main && p.city !== p.district ? p.city : undefined, p.state].filter(Boolean).join(', ')
      return { placeId: `osm:${lat.toFixed(6)},${lng.toFixed(6)}`, main, secondary }
    })
    .filter((s) => s.main)
}

/** The point inside an `osm:` place id, or null. */
export function pointOfOsmId(placeId: string): { lat: number; lng: number } | null {
  const m = /^osm:(-?\d{1,2}(?:\.\d{1,7})?),(-?\d{1,3}(?:\.\d{1,7})?)$/.exec(placeId)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

/**
 * OpenStreetMap (feature 022): Photon for search as you type and Nominatim for the area under a pin. No key.
 * The public servers ask for an identifying User-Agent and, for Nominatim, at most one request a second, so
 * reverse lookups are spaced out in this process. `nominatimUrl` and `photonUrl` point at a hosted or
 * self-hosted instance later. There is no static map image: cards show the area and distance only.
 */
export function osmProvider(options: { userAgent: string; nominatimUrl?: string; photonUrl?: string; minGapMs?: number }): MapsProvider {
  const nominatim = (options.nominatimUrl ?? 'https://nominatim.openstreetmap.org').replace(/\/$/, '')
  const photon = (options.photonUrl ?? 'https://photon.komoot.io').replace(/\/$/, '')
  const gap = options.minGapMs ?? 1100
  let next = 0
  const headers = { 'User-Agent': options.userAgent, Accept: 'application/json' }
  const getJson = async (url: string) => {
    try {
      const res = await fetch(url, { headers, cache: 'no-store' })
      return res.ok ? ((await res.json()) as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  return {
    name: 'osm',
    async reverse(lat, lng, language) {
      // Nominatim's usage policy: at most one request a second from this server.
      const wait = Math.max(0, next - Date.now())
      next = Math.max(next, Date.now()) + gap
      if (wait) await new Promise((r) => setTimeout(r, wait))
      const json = await getJson(`${nominatim}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=${language === 'ar' ? 'ar' : 'en'}`)
      return readNominatim(json as never)
    },
    async autocomplete(q, _sessionToken, language) {
      // The UAE's bounding box; Photon has no Arabic option, so Arabic uses the names as mapped locally.
      const lang = language === 'ar' ? 'default' : 'en'
      const json = await getJson(`${photon}/api/?q=${encodeURIComponent(q)}&limit=8&lang=${lang}&bbox=51.5,22.6,56.4,26.1`)
      return readPhoton(json as never)
    },
    async details(placeId) {
      return pointOfOsmId(placeId)
    },
    staticMapUrl: () => null,
  }
}

let cached: MapsProvider | undefined
let override: MapsProvider | undefined

/** Tests swap in a fake provider; `undefined` restores the configured one. */
export function setMapsProvider(provider: MapsProvider | undefined): void {
  override = provider
}

export function getMapsProvider(e: Pick<Env, 'MAPS_PROVIDER' | 'GOOGLE_MAPS_SERVER_KEY' | 'GOOGLE_MAPS_URL_SECRET' | 'OSM_NOMINATIM_URL' | 'OSM_PHOTON_URL' | 'NEXT_PUBLIC_SITE_URL'>): MapsProvider {
  if (override) return override
  if (cached) return cached
  const which = mapsProviderOf(e)
  cached =
    which === 'google' && e.GOOGLE_MAPS_SERVER_KEY
      ? googleProvider({ server: e.GOOGLE_MAPS_SERVER_KEY, urlSecret: e.GOOGLE_MAPS_URL_SECRET })
      : which === 'osm'
        ? osmProvider({ userAgent: `Shoot/1.0 (+${e.NEXT_PUBLIC_SITE_URL})`, nominatimUrl: e.OSM_NOMINATIM_URL, photonUrl: e.OSM_PHOTON_URL })
        : offProvider
  return cached
}

/** Maps are on for this deployment (the place step shows a map). */
export function mapsEnabled(e: Parameters<typeof getMapsProvider>[0]): boolean {
  return getMapsProvider(e).name !== 'off'
}
