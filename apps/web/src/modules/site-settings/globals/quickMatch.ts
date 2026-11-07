import { NOTIFICATION_EVENTS } from '@shoot/domain/booking'
import type { Tab } from 'payload'

const channelOptions = [
  { label: 'WhatsApp link', value: 'whatsapp' },
  { label: 'Email (feature 008)', value: 'email' },
  { label: 'In the account', value: 'in-app' },
]
const channel = (name: 'client' | 'creator' | 'admin', defaults: string[]) => ({
  name,
  type: 'select' as const,
  hasMany: true,
  defaultValue: defaults,
  options: channelOptions,
})

/** Quick Match settings (FR-012): the flow switch, time windows, payment text and notification wording. */
export const quickMatchTab: Tab = {
  label: 'Quick match',
  fields: [
    {
      name: 'quickMatch',
      type: 'group',
      label: false,
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'On: after the brief, visitors see who is free and get a quotation. Off: the brief goes to WhatsApp, as before.' },
        },
        { type: 'row', fields: [
          { name: 'quotationValidDays', type: 'number', defaultValue: 7, min: 1, max: 60, admin: { width: '25%', description: 'Quotation valid (days)' } },
          { name: 'confirmHours', type: 'number', defaultValue: 24, min: 1, max: 168, admin: { width: '25%', description: 'Creator answers within (hours)' } },
          { name: 'deliveryConfirmDays', type: 'number', defaultValue: 7, min: 1, max: 30, admin: { width: '25%', description: 'Client confirms delivery within (days)' } },
          { name: 'payoutDays', type: 'number', defaultValue: 10, min: 1, max: 60, admin: { width: '25%', description: 'Creator paid within (days)' } },
        ] },
        { name: 'quoteLimitPerHour', type: 'number', defaultValue: 5, min: 1, max: 100, admin: { description: 'Quotations one visitor may request per hour.' } },
        { name: 'paymentInstructions', type: 'richText', localized: true, admin: { description: 'Shown once the creator confirms: how to pay and to send the receipt on WhatsApp.' } },
        { name: 'quotationTerms', type: 'richText', localized: true, admin: { description: 'Printed at the end of every quotation.' } },
        {
          name: 'channels',
          type: 'group',
          admin: { description: 'Where each person is told about a change. Nothing is sent automatically yet: WhatsApp rows are links to open.' },
          fields: [{ type: 'row', fields: [channel('client', ['whatsapp']), channel('creator', ['in-app', 'whatsapp']), channel('admin', ['in-app'])] }],
        },
        {
          name: 'templates',
          type: 'array',
          labels: { singular: 'Message', plural: 'Messages' },
          admin: { description: 'Placeholders: {name} {reference} {date} {total} {link}. A missing Arabic text falls back to English.', initCollapsed: true },
          fields: [
            { type: 'row', fields: [
              { name: 'event', type: 'select', required: true, options: NOTIFICATION_EVENTS.map((value) => ({ label: value, value })), admin: { width: '50%' } },
              { name: 'audience', type: 'select', required: true, options: ['client', 'creator', 'admin'].map((value) => ({ label: value, value })), admin: { width: '50%' } },
            ] },
            { name: 'text', type: 'textarea', required: true, localized: true, maxLength: 600 },
          ],
        },
      ],
    },
  ],
}
