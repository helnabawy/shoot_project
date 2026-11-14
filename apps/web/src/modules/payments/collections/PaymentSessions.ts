import type { CollectionConfig } from 'payload'
import { isAdmin, nobody } from '@/shared/payload/access'

/**
 * One attempt to pay a booking online (feature 020, data-model.md): lets an open checkout be reused and a
 * provider notice be matched to its booking. Written by the server only; admins can read it.
 */
export const PaymentSessions: CollectionConfig = {
  slug: 'payment-sessions',
  labels: { singular: 'Online payment attempt', plural: 'Online payment attempts' },
  admin: {
    group: 'Bookings',
    useAsTitle: 'providerSessionId',
    defaultColumns: ['booking', 'status', 'amountFils', 'createdAt', 'expiresAt'],
    description: 'Each time a client opened the secure payment page. Paid attempts have a payment in Payments.',
  },
  access: { read: isAdmin, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'booking', type: 'relationship', relationTo: 'bookings', required: true, index: true, admin: { readOnly: true } },
    { name: 'revision', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'amountFils', label: 'Amount (fils)', type: 'number', required: true, admin: { readOnly: true } },
    { name: 'provider', type: 'select', required: true, defaultValue: 'stripe', options: [{ label: 'Stripe', value: 'stripe' }], admin: { readOnly: true } },
    { name: 'providerSessionId', type: 'text', required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: 'url', type: 'text', required: true, admin: { readOnly: true } },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      index: true,
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Paid', value: 'paid' },
        { label: 'Expired', value: 'expired' },
      ],
      admin: { readOnly: true },
    },
    { name: 'expiresAt', type: 'date', required: true, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'paymentRef', type: 'text', admin: { readOnly: true } },
  ],
}
