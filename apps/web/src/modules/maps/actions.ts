'use server'

import type { PlaceV1 } from '@shoot/domain/api/v1'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { env } from '@/shared/lib/env'
import { getPayloadClient } from '@/shared/lib/payload'
import { placeAt, pinMapUrl } from './place'
import { getMapsProvider, type PlaceSuggestion } from './providers'

/**
 * 022 (US1, boards 57–63): the website's place step. Search, pick and "use my location" go through the server
 * so the map keys stay there. Nothing is stored; the brief stores its pin when it is sent.
 */
const lang = (locale: string): Locale => (isLocale(locale) ? locale : 'en')
const token = (value: string) => (/^[\w-]{8,64}$/.test(value) ? value : 'session-none')

export type PlacePick = PlaceV1 & { mapUrl: string | null; placeId?: string }

export async function searchPlaces(q: string, sessionToken: string, locale: string): Promise<PlaceSuggestion[]> {
  const text = q.trim().slice(0, 120)
  if (text.length < 2) return []
  return getMapsProvider(env()).autocomplete(text, token(sessionToken), lang(locale))
}

export async function pickPlace(placeId: string, sessionToken: string, locale: string): Promise<PlacePick | null> {
  const point = await getMapsProvider(env()).details(placeId.slice(0, 300), token(sessionToken), lang(locale))
  if (!point) return null
  return { ...(await placeAt(await getPayloadClient(), point.lat, point.lng, lang(locale))), mapUrl: pinMapUrl(point.lat, point.lng, lang(locale)), placeId }
}

export async function locatePlace(lat: number, lng: number, locale: string): Promise<PlacePick | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { ...(await placeAt(await getPayloadClient(), lat, lng, lang(locale))), mapUrl: pinMapUrl(lat, lng, lang(locale)) }
}
