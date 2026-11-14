import { NOTIFICATION_EVENTS } from '@shoot/domain/booking'
import { APIError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { isAdmin, isAdminField, nobody } from '@/shared/payload/access'
import { adminOrRecipient } from '../access'

/** Only admins change a row; its recipient may only mark it read. */
const adminOnly = { update: isAdminField }

/** A row is about one booking or, for the brief inbox (feature 019), one brief. */
const bookingOrBrief: CollectionBeforeValidateHook = ({ data, operation }) => {
  if (operation !== 'create' || !data) return data
  if (Boolean(data.booking) === Boolean(data.brief)) throw new APIError('A notification needs a booking or a brief.', 400)
  return data
}

/** The notification log (FR-006). Nothing is sent from here: WhatsApp rows carry a link to open (feature 008 sends). */
export const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: { singular: 'Notification', plural: 'Notifications' },
  admin: { group: 'Bookings', useAsTitle: 'event', defaultColumns: ['booking', 'event', 'audience', 'channel', 'link', 'createdAt'], description: 'What each person should be told. Open a WhatsApp link to send it.' },
  access: { read: adminOrRecipient, create: nobody, update: adminOrRecipient, delete: isAdmin },
  defaultSort: '-createdAt',
  hooks: { beforeValidate: [bookingOrBrief] },
  fields: [
    { name: 'booking', type: 'relationship', relationTo: 'bookings', index: true, access: adminOnly },
    { name: 'brief', type: 'relationship', relationTo: 'briefs', index: true, access: adminOnly },
    { access: adminOnly, name: 'event', type: 'select', required: true, options: NOTIFICATION_EVENTS.map((value) => ({ label: value, value })) },
    { type: 'row', fields: [
      { access: adminOnly, name: 'audience', type: 'select', required: true, options: ['client', 'creator', 'admin'].map((value) => ({ label: value, value })) },
      { access: adminOnly, name: 'channel', type: 'select', required: true, index: true, options: ['whatsapp', 'email', 'in-app', 'push'].map((value) => ({ label: value, value })) },
      { access: adminOnly, name: 'locale', type: 'select', defaultValue: 'en', options: [{ label: 'English', value: 'en' }, { label: 'العربية', value: 'ar' }] },
    ] },
    { access: adminOnly, name: 'user', type: 'relationship', relationTo: 'users', index: true },
    { access: adminOnly, name: 'text', type: 'textarea', required: true, maxLength: 1000 },
    { access: adminOnly, name: 'link', type: 'text' },
    { name: 'dedupeKey', type: 'text', required: true, unique: true, index: true, admin: { hidden: true } },
    // The recipient may mark their own row as read; nothing else.
    { name: 'readAt', type: 'date', access: { update: ({ req }) => Boolean(req.user) } },
  ],
}
