import type { CollectionConfig } from 'payload'
import { nobody } from '@/shared/payload/access'
import { adminOrBookingMember, serverOnly } from '../access'

const locked = { create: serverOnly, update: serverOnly }

/** A quotation version: its lines and amounts are frozen when issued (FR-004, FR-010). Amounts in fils. */
export const Quotations: CollectionConfig = {
  slug: 'quotations',
  labels: { singular: 'Quotation', plural: 'Quotations' },
  admin: { group: 'Bookings', useAsTitle: 'reference', defaultColumns: ['reference', 'booking', 'version', 'totalFils', 'validUntil'], description: 'Issued by the site; adjust a price from the booking.' },
  access: { read: adminOrBookingMember, create: nobody, update: nobody, delete: nobody },
  defaultSort: '-createdAt',
  fields: [
    { name: 'reference', type: 'text', required: true, unique: true, index: true, access: locked, admin: { readOnly: true } },
    { name: 'booking', type: 'relationship', relationTo: 'bookings', required: true, index: true, access: locked, admin: { readOnly: true } },
    { name: 'brief', type: 'relationship', relationTo: 'briefs', required: true, access: locked, admin: { readOnly: true } },
    { type: 'row', fields: [
      { name: 'version', type: 'number', required: true, defaultValue: 1, access: locked, admin: { readOnly: true } },
      { name: 'supersededBy', type: 'relationship', relationTo: 'quotations', access: locked, admin: { readOnly: true } },
    ] },
    {
      name: 'lines',
      type: 'array',
      access: locked,
      admin: { readOnly: true },
      fields: [
        { type: 'row', fields: [
          { name: 'kind', type: 'select', required: true, options: ['tier', 'travel', 'addon', 'discount', 'adjustment'].map((value) => ({ label: value, value })) },
          { name: 'labelEn', type: 'text', required: true },
          { name: 'labelAr', type: 'text', required: true },
          { name: 'amountFils', type: 'number', required: true },
          { name: 'persona', type: 'relationship', relationTo: 'personas' },
        ] },
        { name: 'deliverables', type: 'json', admin: { description: '{ en: string[], ar: string[] }' } },
      ],
    },
    { type: 'row', fields: [
      { name: 'subtotalFils', type: 'number', required: true, access: locked, admin: { readOnly: true } },
      { name: 'discountFils', type: 'number', defaultValue: 0, access: locked, admin: { readOnly: true } },
      { name: 'totalFils', type: 'number', required: true, access: locked, admin: { readOnly: true } },
    ] },
    { type: 'row', fields: [
      { name: 'promoCode', type: 'text', access: locked, admin: { readOnly: true } },
      { name: 'validUntil', type: 'date', required: true, access: locked, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'issuedAt', type: 'date', required: true, access: locked, admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    ] },
  ],
}
