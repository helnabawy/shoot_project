import type { CollectionConfig } from 'payload'
import { isEditorField, isEditorOrOwner, nobody, noOne } from '@/shared/payload/access'
import { revalidateTagAfterChange } from '@/shared/payload/hooks/revalidate'

/**
 * A profile's standing: pause, suspension, featuring, review note and review dates. Not versioned,
 * so a change is live at once and never publishes the provider's pending edits (research §18).
 * Never publicly readable; created and deleted only by the profile's hooks.
 */
export const CreatorListings: CollectionConfig = {
  slug: 'creator-listings',
  labels: { singular: 'Creator listing', plural: 'Creator listings' },
  admin: {
    group: 'People',
    useAsTitle: 'id',
    defaultColumns: ['profile', 'active', 'suspended', 'featured', 'submittedAt', 'verifiedAt'],
    description:
      'Standing of a creator profile. Suspend and Feature take effect at once and never publish pending edits; to verify a profile, publish it in Creator profiles.',
    components: { beforeListTable: ['/modules/admin/components/CreatorListingsNote#CreatorListingsNote'] },
  },
  access: {
    read: isEditorOrOwner('user'),
    create: nobody,
    update: isEditorOrOwner('user'),
    delete: nobody,
  },
  hooks: { afterChange: [revalidateTagAfterChange('creators')] },
  fields: [
    {
      name: 'profileLink',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/modules/admin/components/CreatorLinks#ListingProfileLink' } },
    },
    {
      name: 'profile',
      type: 'relationship',
      relationTo: 'creator-profiles',
      required: true,
      unique: true,
      index: true,
      access: { update: noOne },
    },
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, access: { update: noOne } },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { description: 'The provider’s pause switch. Off hides the profile everywhere, direct link included.' },
    },
    { name: 'featured', type: 'checkbox', defaultValue: false, index: true, access: { update: isEditorField } },
    {
      name: 'suspended',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      access: { update: isEditorField },
      admin: { description: 'Hides a published profile at once; its content and pending edits are kept.' },
    },
    {
      name: 'reviewNote',
      type: 'textarea',
      access: { update: isEditorField },
      admin: { description: 'Shown to the provider in their status banner.' },
    },
    {
      name: 'matchValues',
      type: 'text',
      hasMany: true,
      access: { create: isEditorField, update: isEditorField },
      admin: { description: 'Quick Match: option values this creator satisfies for brief slots that filter creators (e.g. woman).' },
    },
    { name: 'submittedAt', type: 'date', index: true, access: { update: isEditorField } },
    { name: 'verifiedAt', type: 'date', access: { update: noOne }, admin: { readOnly: true } },
  ],
}
