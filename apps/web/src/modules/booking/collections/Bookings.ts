import { BOOKING_STATES } from '@shoot/domain/booking'
import type { CollectionConfig, Field } from 'payload'
import { isAdmin, isAdminField, nobody } from '@/shared/payload/access'
import { adminOrMember, serverOnly } from '../access'
import { exportBookingsCsv } from '../export'
import { bookingAfterChange, bookingBeforeChange } from '../hooks'

const locked = { create: serverOnly, update: serverOnly }
const stamp = (name: string, label: string): Field => ({ name, label, type: 'date', access: locked, admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } })

/**
 * One client request: a brief, its current quotation, one assignment per professional type and an explicit
 * state (FR-005). State, money and timestamps change only through transitions (research §7–§8); admins use
 * "Change state", the assignments' creator and "Adjust price", which the hooks turn into transitions.
 */
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  labels: { singular: 'Booking', plural: 'Bookings' },
  admin: {
    group: 'Bookings',
    useAsTitle: 'reference',
    defaultColumns: ['reference', 'state', 'date', 'totalFils', 'updatedAt'],
    listSearchableFields: ['reference'],
    description: 'Every quotation request and where it stands. Amounts are in fils (AED × 100).',
    components: { beforeListTable: ['/modules/admin/components/BookingsExport#BookingsExport'] },
  },
  endpoints: [exportBookingsCsv],
  access: { read: adminOrMember, create: nobody, update: isAdmin, delete: nobody },
  defaultSort: '-createdAt',
  hooks: { beforeChange: [bookingBeforeChange], afterChange: [bookingAfterChange] },
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true, access: locked, admin: { readOnly: true } },
    {
      name: 'state',
      type: 'select',
      required: true,
      defaultValue: 'quoted',
      index: true,
      access: locked,
      options: BOOKING_STATES.map((value) => ({ label: value, value })),
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'adminAction',
      label: 'Change state',
      type: 'select',
      virtual: true,
      access: { read: isAdminField, create: isAdminField, update: isAdminField },
      options: [
        { label: 'Confirm for the creator', value: 'confirm' },
        { label: 'Mark as scheduled', value: 'schedule' },
        { label: 'Mark as delivered', value: 'deliver' },
        { label: 'Complete', value: 'complete' },
        { label: 'Put on hold', value: 'hold' },
        { label: 'Cancel', value: 'cancel' },
      ],
      admin: { position: 'sidebar', description: 'Applied through the booking rules; refused if not allowed from the current state. Record payments in Payments.' },
    },
    { name: 'revision', type: 'number', defaultValue: 0, access: locked, admin: { hidden: true } },
    { name: 'brief', type: 'relationship', relationTo: 'briefs', required: true, index: true, access: locked, admin: { readOnly: true } },
    { name: 'quotation', type: 'relationship', relationTo: 'quotations', access: locked, admin: { readOnly: true } },
    { name: 'member', type: 'relationship', relationTo: 'users', index: true, access: locked, admin: { readOnly: true, position: 'sidebar' } },
    { name: 'accessSalt', type: 'text', access: { read: () => false, create: serverOnly, update: serverOnly }, admin: { hidden: true } },
    {
      name: 'client',
      type: 'group',
      access: locked,
      admin: { readOnly: true },
      fields: [
        { type: 'row', fields: [
          { name: 'name', type: 'text', maxLength: 80 },
          { name: 'whatsapp', type: 'text' },
          { name: 'locale', type: 'select', defaultValue: 'en', options: [{ label: 'English', value: 'en' }, { label: 'العربية', value: 'ar' }] },
        ] },
      ],
    },
    { type: 'row', fields: [
      { name: 'date', type: 'text', index: true, access: locked, admin: { readOnly: true, description: 'Shoot day (UAE), YYYY-MM-DD' } },
      { name: 'location', type: 'text', access: locked, admin: { readOnly: true } },
      { name: 'totalFils', label: 'Total (fils)', type: 'number', access: locked, admin: { readOnly: true } },
    ] },
    { name: 'personas', type: 'relationship', relationTo: 'personas', hasMany: true, access: locked, admin: { readOnly: true } },
    {
      name: 'assignments',
      type: 'array',
      admin: { description: 'One row per professional type. Change the creator to reassign; the confirmation window restarts.' },
      fields: [
        { type: 'row', fields: [
          { name: 'persona', type: 'relationship', relationTo: 'personas', required: true, access: { update: serverOnly } },
          { name: 'creator', type: 'relationship', relationTo: 'creator-profiles' },
          { name: 'status', type: 'select', defaultValue: 'open', access: { update: serverOnly }, options: ['open', 'pending', 'confirmed', 'declined', 'lapsed'].map((value) => ({ label: value, value })) },
        ] },
        { type: 'row', fields: [
          { name: 'respondBy', type: 'date', access: { update: serverOnly }, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
          { name: 'respondedAt', type: 'date', access: { update: serverOnly }, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
          { name: 'declineReason', type: 'text', maxLength: 200, access: { update: serverOnly }, admin: { readOnly: true } },
        ] },
      ],
    },
    {
      name: 'priceAdjustment',
      label: 'Adjust price',
      type: 'group',
      virtual: true,
      access: { read: isAdminField, create: isAdminField, update: isAdminField },
      admin: { description: 'Issues a new quotation version with this adjustment line (negative for a discount).' },
      fields: [
        { type: 'row', fields: [
          { name: 'amount', type: 'number', virtual: true, admin: { step: 0.01, description: 'AED, ±' } },
          { name: 'reason', type: 'text', virtual: true, maxLength: 200 },
        ] },
      ],
    },
    { name: 'holdReason', type: 'textarea', maxLength: 500, access: locked, admin: { readOnly: true } },
    { name: 'adminNote', type: 'textarea', access: { read: isAdminField, update: isAdminField } },
    { name: 'quoteValidUntil', type: 'date', access: locked, admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } } },
    stamp('acceptedAt', 'Accepted'),
    stamp('confirmedAt', 'Confirmed'),
    stamp('paidAt', 'Paid (held)'),
    stamp('scheduledAt', 'Scheduled'),
    stamp('deliveredAt', 'Delivered'),
    stamp('completedAt', 'Completed'),
    stamp('payoutDueAt', 'Payout due'),
    stamp('onHoldAt', 'On hold'),
    stamp('cancelledAt', 'Cancelled'),
    stamp('expiredAt', 'Expired'),
    stamp('overdueNotifiedAt', 'Admins told delivery is unconfirmed'),
    { name: 'quotations', type: 'join', collection: 'quotations', on: 'booking', admin: { defaultColumns: ['reference', 'version', 'totalFils', 'validUntil'] } },
    { name: 'payments', type: 'join', collection: 'payments', on: 'booking', admin: { defaultColumns: ['kind', 'amount', 'method', 'recordedAt'] } },
    { name: 'events', type: 'join', collection: 'booking-events', on: 'booking', admin: { defaultColumns: ['event', 'from', 'to', 'actorRole', 'at'] } },
    { name: 'notifications', type: 'join', collection: 'notifications', on: 'booking', admin: { defaultColumns: ['event', 'audience', 'channel', 'link'] } },
  ],
}
