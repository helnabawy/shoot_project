import type { GroupField } from 'payload'

export const CTA_KINDS = ['whatsapp', 'link', 'call'] as const
export type CtaKind = (typeof CTA_KINDS)[number]

/** A call to action: localised label, what it does, and a link target for `link`. */
export function ctaGroup(name: string, label?: string): GroupField {
  return {
    name,
    label: label ?? name,
    type: 'group',
    fields: [
      { name: 'label', type: 'text', localized: true },
      {
        name: 'kind',
        type: 'select',
        defaultValue: 'whatsapp',
        options: [
          { label: 'Open WhatsApp', value: 'whatsapp' },
          { label: 'Link to a page or section', value: 'link' },
          { label: 'Phone call', value: 'call' },
        ],
      },
      {
        name: 'href',
        type: 'text',
        admin: {
          condition: (_data, sibling) => sibling?.kind === 'link',
          description: 'A path ("/register") or an in-page anchor ("#how-it-works").',
        },
      },
    ],
  }
}
