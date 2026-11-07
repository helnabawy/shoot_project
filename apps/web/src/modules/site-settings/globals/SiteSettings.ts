import { isE164, normaliseE164 } from '@shoot/domain/contact'
import type { GlobalConfig } from 'payload'
import { anyone, isAdmin } from '@/shared/payload/access'
import { revalidateTagAfterChange } from '@/shared/payload/hooks/revalidate'

const normalisePhone = ({ value }: { value?: unknown }) =>
  typeof value === 'string' && value ? (normaliseE164(value) ?? value) : value

const e164OrEmpty = (required: boolean) => (value: unknown) =>
  (!value && !required) || isE164(value) || 'Use the international format with the country code, e.g. +971 58 123 4567.'

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  admin: { group: 'Content', description: 'Contact details, the active audience and site-wide labels.' },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidateTagAfterChange('site-settings')] },
  fields: [
    {
      name: 'translationStatus',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/modules/admin/components/UntranslatedFields#UntranslatedFields' } },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Brand & contact',
          fields: [
            { name: 'siteName', type: 'text', required: true, localized: true },
            { type: 'row', fields: [
              { name: 'logo', type: 'upload', relationTo: 'media', admin: { description: 'Optional. Without a logo the site name is shown.' } },
              { name: 'logoDark', type: 'upload', relationTo: 'media', admin: { description: 'Optional version for dark backgrounds.' } },
            ] },
            {
              name: 'whatsappNumber',
              type: 'text',
              required: true,
              validate: e164OrEmpty(true),
              hooks: { beforeValidate: [normalisePhone] },
              admin: { description: 'International format with country code. Used by every WhatsApp button on the site.' },
            },
            {
              name: 'whatsappDefaultMessage',
              type: 'textarea',
              localized: true,
              admin: { description: 'The message pre-filled when a visitor taps a WhatsApp button.' },
            },
            {
              name: 'expectedReplyTime',
              type: 'text',
              localized: true,
              admin: { description: 'Shown after a brief is sent, e.g. "within 15 minutes".' },
            },
            {
              name: 'phoneNumber',
              type: 'text',
              validate: e164OrEmpty(false),
              hooks: { beforeValidate: [normalisePhone] },
            },
            { name: 'contactEmail', type: 'email' },
            {
              name: 'social',
              type: 'array',
              fields: [
                { type: 'row', fields: [
                  {
                    name: 'platform',
                    type: 'select',
                    required: true,
                    options: ['instagram', 'linkedin', 'youtube', 'tiktok', 'x'].map((v) => ({ label: v, value: v })),
                  },
                  { name: 'url', type: 'text', required: true },
                ] },
              ],
            },
          ],
        },
        {
          label: 'Audience',
          fields: [
            {
              name: 'activePersonasWarning',
              type: 'ui',
              admin: { components: { Field: '/modules/admin/components/ActivePersonasWarning#ActivePersonasWarning' } },
            },
            {
              name: 'activePersonas',
              type: 'relationship',
              relationTo: 'personas',
              hasMany: true,
              admin: {
                description:
                  'Which kinds of professional the site offers, in display order. Drag to reorder. Empty hides every audience-dependent part of the site.',
              },
            },
            {
              name: 'labels',
              type: 'group',
              admin: { description: 'You can use {persona.singular}, {persona.plural} and {personas.list}.' },
              fields: [
                { name: 'seekerLabel', type: 'text', localized: true },
                { name: 'providerLabel', type: 'text', localized: true },
              ],
            },
          ],
        },
        {
          label: 'Brief limits',
          fields: [
            {
              name: 'briefLimitPerHour',
              type: 'number',
              defaultValue: 5,
              min: 1,
              max: 100,
              admin: { description: 'How many briefs one anonymous visitor may send per hour.' },
            },
          ],
        },
      ],
    },
  ],
}
