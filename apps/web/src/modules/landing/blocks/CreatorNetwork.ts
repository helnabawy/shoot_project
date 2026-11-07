import type { Block } from 'payload'
import { anchorField } from '@/shared/payload/fields/anchor'
import { ctaGroup } from '@/shared/payload/fields/cta'

/** "Our network": creators chosen by an editor-set rule, linking to the directory (CP-FR-003). */
export const CreatorNetwork: Block = {
  slug: 'creatorNetwork',
  interfaceName: 'CreatorNetworkBlock',
  labels: { singular: 'Our network', plural: 'Our network' },
  fields: [
    anchorField('our-network'),
    { name: 'heading', type: 'text', localized: true, required: true },
    { name: 'subheading', type: 'textarea', localized: true },
    {
      name: 'rule',
      type: 'select',
      defaultValue: 'featuredThenNewest',
      options: [
        { label: 'Featured first, then newest', value: 'featuredThenNewest' },
        { label: 'Newest first', value: 'newest' },
        { label: 'Featured only', value: 'featuredOnly' },
      ],
    },
    { name: 'count', type: 'number', defaultValue: 6, min: 3, max: 12, required: true },
    {
      ...ctaGroup('cta'),
      admin: { description: 'Leave the label empty to hide this action. Link to the creator directory: /creators.' },
    },
  ],
}
