import 'server-only'
import { contactNumber, creatorSeesClient, sharesContact, type BookingState } from '@shoot/domain/booking'
import { buildWhatsAppLink } from '@shoot/domain/contact'
import type { Payload } from 'payload'
import { getTranslations } from 'next-intl/server'
import type { Booking } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'
import type { ContactView } from './components/ContactRows'
import { idOf, toAssignments } from './rows'

/**
 * Feature 025: the other side of a paid booking (until delivered), with their verified sign-in number (009). Numbers are
 * read here and nowhere else, after checking who asks: the booking's signed-in client gets its booked
 * creators, a creator whose own part is confirmed gets the client. Everyone else gets nothing (FR-003).
 */
export type { ContactView }

type BookingLike = Pick<Booking, 'id' | 'state' | 'member' | 'assignments' | 'reference' | 'client'>

const NAME = (rel: unknown, key: string) => (rel && typeof rel === 'object' ? String((rel as Record<string, unknown>)[key] ?? '') : '')
const firstName = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] ?? ''

/** Verified numbers by user id; an email-only account has none. */
async function numbersOf(payload: Payload, userIds: number[]): Promise<Map<number, { number: string; name: string }>> {
  const ids = [...new Set(userIds)]
  if (!ids.length) return new Map()
  const { docs } = await payload.find({ collection: 'users', where: { id: { in: ids } }, depth: 0, limit: ids.length, pagination: false, overrideAccess: true, showHiddenFields: true, select: { username: true, name: true } })
  return new Map(docs.map((u) => [u.id, { number: (u as { username?: string | null }).username ?? '', name: u.name ?? '' }]))
}

function view(name: string, role: string, number: string, message: string): ContactView | null {
  const contact = contactNumber(number)
  if (!contact) return null
  return { name, role, phone: contact.phone, display: contact.display, telHref: `tel:${contact.phone}`, whatsappHref: buildWhatsAppLink(contact.phone, message) }
}

/** The booked creators as the booking's own signed-in client sees them (US1); empty for anyone else. */
export async function creatorContactsFor(payload: Payload, booking: BookingLike, viewerId: number | null | undefined, locale: Locale, reference = booking.reference): Promise<ContactView[]> {
  const member = booking.member ? Number(idOf(booking.member)) : null
  if (viewerId == null || member === null || member !== viewerId) return []
  if (!sharesContact(booking.state as BookingState)) return []
  // One entry per creator, with every type they are booked for.
  const roles = new Map<number, string[]>()
  for (const row of booking.assignments ?? []) {
    const creator = idOf(row.creator)
    if (!creator || row.status !== 'confirmed') continue
    const list = roles.get(Number(creator)) ?? []
    const type = NAME(row.persona, 'singular')
    if (type && !list.includes(type)) list.push(type)
    roles.set(Number(creator), list)
  }
  if (!roles.size) return []
  const [{ docs: profiles }, t] = await Promise.all([
    payload.find({ collection: 'creator-profiles', where: { id: { in: [...roles.keys()] } }, depth: 0, draft: false, locale, fallbackLocale: 'en', limit: roles.size, pagination: false, overrideAccess: true, select: { user: true, displayName: true } }),
    getTranslations({ locale, namespace: 'booking.contact' }),
  ])
  const numbers = await numbersOf(payload, profiles.map((p) => Number(idOf(p.user))).filter(Number.isFinite))
  const contacts: ContactView[] = []
  for (const [creatorId, types] of roles) {
    const profile = profiles.find((p) => p.id === creatorId)
    const owner = profile ? numbers.get(Number(idOf(profile.user))) : undefined
    if (!profile || !owner) continue
    const name = String((profile as { displayName?: string | null }).displayName ?? '') || owner.name
    const contact = view(name, types.join(locale === 'ar' ? ' و' : ' and '), owner.number, t('message', { name: firstName(name), reference }))
    if (contact) contacts.push({ ...contact, creatorId })
  }
  return contacts
}

/**
 * The client of each booking as a creator sees them (US2), by booking id: only bookings on which one of
 * `profileIds` has a confirmed part, in a sharing state. One users read for all rows.
 */
export async function clientContactsFor(payload: Payload, bookings: BookingLike[], profileIds: number[], locale: Locale): Promise<Map<number, ContactView>> {
  const mine = profileIds.map(String)
  const shared = bookings.filter((b) => b.member && toAssignments(b.assignments).some((a) => a.creatorId && mine.includes(a.creatorId) && creatorSeesClient(b.state as BookingState, a.status)))
  if (!shared.length) return new Map()
  const [numbers, t] = await Promise.all([numbersOf(payload, shared.map((b) => Number(idOf(b.member)))), getTranslations({ locale, namespace: 'booking.contact' })])
  const contacts = new Map<number, ContactView>()
  for (const b of shared) {
    const owner = numbers.get(Number(idOf(b.member)))
    if (!owner) continue
    const name = firstName(b.client?.name) || firstName(owner.name)
    const contact = view(name, '', owner.number, t(name ? 'message' : 'messageNoName', { name, reference: b.reference }))
    if (contact) contacts.set(b.id, contact)
  }
  return contacts
}
