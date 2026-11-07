import type { CollectionConfig } from 'payload'
import { BOOKING_STATES } from '@shoot/domain/booking'
import { isAdmin, nobody } from '@/shared/payload/access'

const states = [...BOOKING_STATES, 'assignment'].map((value) => ({ label: value, value }))

/** The audit trail: one row per applied change, never edited (FR-005). */
export const BookingEvents: CollectionConfig = {
  slug: 'booking-events',
  labels: { singular: 'Booking event', plural: 'Booking events' },
  admin: { group: 'Bookings', useAsTitle: 'event', defaultColumns: ['booking', 'event', 'from', 'to', 'actorRole', 'at'] },
  access: { read: isAdmin, create: nobody, update: nobody, delete: nobody },
  defaultSort: '-at',
  fields: [
    { name: 'booking', type: 'relationship', relationTo: 'bookings', required: true, index: true },
    { name: 'event', type: 'text', required: true },
    { type: 'row', fields: [
      { name: 'from', type: 'select', options: states },
      { name: 'to', type: 'select', options: states },
    ] },
    { name: 'actorRole', type: 'select', required: true, options: ['client', 'creator', 'admin', 'system'].map((value) => ({ label: value, value })) },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'note', type: 'textarea', maxLength: 500 },
    { name: 'at', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
  ],
}
