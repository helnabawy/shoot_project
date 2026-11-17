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
  name: 'google' | 'off' | 'fake'
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

let cached: MapsProvider | undefined
let override: MapsProvider | undefined

/** Tests swap in a fake provider; `undefined` restores the configured one. */
export function setMapsProvider(provider: MapsProvider | undefined): void {
  override = provider
}

export function getMapsProvider(e: Pick<Env, 'MAPS_PROVIDER' | 'GOOGLE_MAPS_SERVER_KEY' | 'GOOGLE_MAPS_URL_SECRET'>): MapsProvider {
  if (override) return override
  if (cached) return cached
  cached = mapsProviderOf(e) === 'google' && e.GOOGLE_MAPS_SERVER_KEY ? googleProvider({ server: e.GOOGLE_MAPS_SERVER_KEY, urlSecret: e.GOOGLE_MAPS_URL_SECRET }) : offProvider
  return cached
}

/** Maps are on for this deployment (the place step shows a map). */
export function mapsEnabled(e: Pick<Env, 'MAPS_PROVIDER' | 'GOOGLE_MAPS_SERVER_KEY' | 'GOOGLE_MAPS_URL_SECRET'>): boolean {
  return getMapsProvider(e).name !== 'off'
}
