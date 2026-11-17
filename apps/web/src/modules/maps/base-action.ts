'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/modules/auth/session'
import { isLocale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { placeAt } from './place'

export type BaseState = { status: 'idle' | 'saved' | 'cleared' } | { status: 'error'; error: string }

/**
 * 022 (T078): a creator's starting point, so the inbox can say how far each brief is. Only the creator and the
 * team read it; it is never shown to clients. Set from the same picker as the brief's place; inside the emirates
 * served only.
 */
export async function saveMyBase(_prev: BaseState, form: FormData): Promise<BaseState> {
  const user = await getCurrentUser()
  if (user?.accountType !== 'provider') return { status: 'error', error: 'creators.errors.notProvider' }
  const locale = isLocale(form.get('locale')) ? (form.get('locale') as 'en' | 'ar') : 'en'
  const payload = await getPayloadClient()
  const profile = (await payload.find({ collection: 'creator-profiles', where: { user: { equals: user.id } }, draft: true, limit: 1, depth: 0, overrideAccess: true })).docs[0]
  if (!profile) return { status: 'error', error: 'creators.errors.notProvider' }
  if (form.get('clear') === '1') {
    await payload.update({ collection: 'creator-profiles', id: profile.id, data: { base: { lat: null, lng: null, area: null } } as never, overrideAccess: true, draft: false })
    revalidatePath('/account', 'layout')
    return { status: 'cleared' }
  }
  const lat = Number(form.get('place.lat'))
  const lng = Number(form.get('place.lng'))
  if (form.get('place.lat') === null || !Number.isFinite(lat) || !Number.isFinite(lng)) return { status: 'error', error: 'brief.errors.placeOutside' }
  const place = await placeAt(payload, lat, lng, locale)
  if (!place.inside) return { status: 'error', error: 'brief.errors.placeOutside' }
  await payload.update({ collection: 'creator-profiles', id: profile.id, data: { base: { lat, lng, area: place.area } } as never, overrideAccess: true, draft: false, locale })
  revalidatePath('/account', 'layout')
  return { status: 'saved' }
}
