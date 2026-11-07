import { isE164, normaliseE164 } from '@shoot/domain/contact'
import type { GlobalConfig } from 'payload'
import { anyone, isAdmin } from '@/shared/payload/access'
import { validateSlug } from '@/shared/payload/fields/slug'
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
          label: 'Footer',
          fields: [
            {
              name: 'footerGroups',
              type: 'array',
              maxRows: 4,
              admin: {
                description:
                  'Up to four headings in the footer. A page joins a group in its own Navigation settings. The legal links (Terms, Privacy) are always shown.',
              },
              validate: (rows: unknown) => {
                const keys = ((rows ?? []) as { key?: string }[]).map((r) => r.key).filter(Boolean)
                return new Set(keys).size === keys.length || 'Each footer group needs its own key.'
              },
              fields: [
                { type: 'row', fields: [
                  {
                    name: 'key',
                    type: 'text',
                    required: true,
                    validate: validateSlug,
                    admin: { description: 'Identifier pages refer to, e.g. "company". Renaming it takes its pages out of the footer until they are placed again.' },
                  },
                  { name: 'label', type: 'text', required: true, localized: true },
                ] },
              ],
            },
          ],
        },
        {
          label: 'Creators',
          fields: [
            {
              name: 'creatorCodePrefix',
              type: 'text',
              defaultValue: 'CR',
              minLength: 2,
              maxLength: 4,
              validate: (value: unknown) => (typeof value === 'string' && /^[A-Za-z]{2,4}$/.test(value)) || 'Use 2 to 4 letters.',
              hooks: { beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)] },
              admin: {
                description:
                  'Shown in front of every creator code (CR-7K4Q2). Decided with the brand name. Changing it changes how every code is shown, and old spellings still work.',
              },
            },
            {
              name: 'autoPublishEdits',
              type: 'checkbox',
              defaultValue: false,
              admin: { description: 'When on, a verified creator’s edits go live at once instead of waiting for approval.' },
            },
            {
              name: 'directoryPageSize',
              type: 'number',
              defaultValue: 24,
              min: 6,
              max: 60,
              admin: { description: 'Creators per page in the directory.' },
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
