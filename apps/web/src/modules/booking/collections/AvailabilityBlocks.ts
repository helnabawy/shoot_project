import { dubaiToday, isIsoDay } from '@shoot/domain/booking'
import { APIError, type CollectionBeforeChangeHook, type CollectionConfig, type Where } from 'payload'
import { hasRole, isAdmin } from '@/shared/payload/access'

/** Providers block their own dates; `booking` rows come only from a confirmation (research §6). */
const ownBlockedDate: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  // Server writes (no user) and admins skip the provider rules; anonymous REST calls never get here (create access).
  if (operation !== 'create' || !req.user || hasRole(req.user as never, 'admin') || req.context?.bookingTransition) return data
  if (data.kind && data.kind !== 'blocked') throw new APIError('availability.errors.kind', 403, undefined, true)
  if (!isIsoDay(data.date) || data.date < dubaiToday(new Date())) throw new APIError('availability.errors.past', 400, undefined, true)
  const creatorId = typeof data.creator === 'object' ? data.creator?.id : data.creator
  const own = await req.payload.find({
    collection: 'creator-profiles',
    where: { and: [{ id: { equals: creatorId } }, { user: { equals: req.user.id } }] },
    draft: true,
    limit: 1,
    depth: 0,
    req,
    overrideAccess: true,
  })
  if (!own.totalDocs) throw new APIError('availability.errors.notYours', 403, undefined, true)
  return { ...data, kind: 'blocked', booking: null, user: req.user.id }
}

export const AvailabilityBlocks: CollectionConfig = {
  slug: 'availability-blocks',
  labels: { singular: 'Unavailable date', plural: 'Unavailable dates' },
  admin: { group: 'Bookings', useAsTitle: 'date', defaultColumns: ['date', 'creator', 'kind', 'booking'], description: 'Creators are free unless a date is listed here. Booked dates are added when a creator confirms.' },
  access: {
    read: ({ req }) => (hasRole(req.user as never, 'admin') ? true : req.user ? { user: { equals: req.user.id } } : false),
    create: ({ req }) => Boolean(req.user),
    update: isAdmin,
    delete: ({ req }) => (hasRole(req.user as never, 'admin') ? true : req.user ? ({ and: [{ user: { equals: req.user.id } }, { kind: { equals: 'blocked' } }] } as Where) : false),
  },
  indexes: [{ fields: ['creator', 'date'], unique: true }],
  hooks: { beforeChange: [ownBlockedDate] },
  fields: [
    { name: 'creator', type: 'relationship', relationTo: 'creator-profiles', required: true, index: true },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
    { name: 'date', type: 'text', required: true, index: true, admin: { description: 'YYYY-MM-DD (UAE)' } },
    { name: 'kind', type: 'select', required: true, defaultValue: 'blocked', options: [{ label: 'Blocked by the creator', value: 'blocked' }, { label: 'Booked', value: 'booking' }] },
    { name: 'booking', type: 'relationship', relationTo: 'bookings', index: true },
  ],
}
