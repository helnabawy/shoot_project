import 'server-only'
import type { PlaceV1 } from '@shoot/domain/api/v1'
import type { Payload } from 'payload'
import { placeOfPin } from '@/modules/booking'
import { getLocations } from '@/modules/creators'
import { env } from '@/shared/lib/env'
import type { Locale } from '@/shared/lib/locale'
import { getMapsProvider } from './providers'

/** Where a pin is (022, R15): its area and emirate when inside an emirate served, else `inside: false`. */
export async function placeAt(payload: Payload, lat: number, lng: number, locale: Locale): Promise<PlaceV1> {
  const found = await placeOfPin(payload, { lat, lng, source: 'drag' }, locale)
  if (!found) return { lat, lng, inside: false, area: null, emirate: null }
  const name = (await getLocations(locale)).find((l) => l.slug === found.emirate.slug)?.name ?? found.emirate.slug
  return { lat, lng, inside: true, area: found.area || null, emirate: { slug: found.emirate.slug, name } }
}

/** A small map of the client's own pin for the place step (null without map keys). */
export const pinMapUrl = (lat: number, lng: number, locale: Locale) => getMapsProvider(env()).staticMapUrl(lat, lng, locale)
