import type { CollectionConfig } from 'payload'
import { isAdmin, nobody } from '@/shared/payload/access'
import { serverOnly } from '../access'
import { paymentAfterChange, paymentBeforeChange } from '../hooks'

/**
 * Payments (FR-007): recorded by hand by an admin (bank transfer, cash), or by the server when the payment
 * provider confirms an online payment (feature 020: source `online`, method `card-online`, the provider's reference).
 */
export const Payments: CollectionConfig = {
  slug: 'payments',
  labels: { singular: 'Payment', plural: 'Payments' },
  admin: { group: 'Bookings', useAsTitle: 'id', defaultColumns: ['booking', 'kind', 'amount', 'method', 'recordedAt'], description: 'Received: the client paid (held until delivery is confirmed). Payout: released to the creator. Refund: returned to the client.' },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: nobody },
  hooks: { beforeChange: [paymentBeforeChange], afterChange: [paymentAfterChange] },
  fields: [
    { name: 'booking', type: 'relationship', relationTo: 'bookings', required: true, index: true, access: { update: serverOnly } },
    { type: 'row', fields: [
      { name: 'kind', type: 'select', required: true, defaultValue: 'received', access: { update: serverOnly }, options: [{ label: 'Received from client', value: 'received' }, { label: 'Payout to creator', value: 'payout' }, { label: 'Refund to client', value: 'refund' }] },
      { name: 'amount', type: 'number', required: true, min: 0.01, access: { update: serverOnly }, admin: { step: 0.01, description: 'AED' } },
      { name: 'method', type: 'select', required: true, defaultValue: 'bank-transfer', options: ['bank-transfer', 'cash', 'card', 'card-online', 'other'].map((value) => ({ label: value, value })) },
    ] },
    { name: 'note', type: 'text', maxLength: 200, admin: { description: 'Receipt or transfer reference.' } },
    { type: 'row', fields: [
      {
        name: 'source',
        type: 'select',
        defaultValue: 'manual',
        options: [{ label: 'Recorded by hand', value: 'manual' }, { label: 'Online (provider)', value: 'online' }],
        access: { create: serverOnly, update: serverOnly },
        admin: { readOnly: true },
      },
      { name: 'providerRef', label: 'Provider reference', type: 'text', unique: true, index: true, access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true, description: 'Find it in the provider dashboard (pi_…).' } },
    ] },
    { name: 'recordedBy', type: 'relationship', relationTo: 'users', access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true } },
    { name: 'recordedAt', type: 'date', access: { create: serverOnly, update: serverOnly }, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
  ],
}
