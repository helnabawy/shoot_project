import { COUNTRIES, isAllowedSocialUrl, isAllowedVideoUrl, isCountryCode, isSpokenLanguage, MAX_SAMPLES, MAX_YEARS_EXPERIENCE, SOCIAL_PLATFORMS, SPOKEN_LANGUAGES, type SocialPlatform } from '@shoot/domain/creators'
import { APIError, type Access, type CollectionConfig, type Where } from 'payload'
import { isAdmin, isEditorUser, noOne } from '@/shared/payload/access'
import { relId } from '../references'
import { guardProviderPublish, prepareProfile, removeListing, revalidateAfterDelete, syncListing } from '../hooks'

/** Ids of profiles an owner or admin has hidden (paused or suspended); public reads exclude them. */
async function hiddenProfileIds(req: Parameters<Access>[0]['req']): Promise<(string | number)[]> {
  const { docs } = await req.payload.find({
    collection: 'creator-listings',
    where: { or: [{ active: { equals: false } }, { suspended: { equals: true } }] },
    select: { profile: true },
    depth: 0,
    pagination: false,
    req,
    overrideAccess: true,
  })
  return docs.map((d) => relId(d.profile)).filter((v): v is string => v !== null)
}

/**
 * Editors see everything. Everyone else sees published profiles whose listing is neither paused nor
 * suspended; a signed-in provider also sees their own profile in any state (research §18).
 */
const readProfiles: Access = async ({ req }) => {
  if (isEditorUser(req.user)) return true
  const hidden = await hiddenProfileIds(req)
  const publicClause: Where = {
    and: [{ _status: { equals: 'published' } }, ...(hidden.length ? [{ id: { not_in: hidden } }] : [])],
  }
  return req.user ? { or: [publicClause, { user: { equals: req.user.id } }] } : publicClause
}

const ownOrEditor: Access = ({ req }) => {
  if (isEditorUser(req.user)) return true
  return req.user ? { user: { equals: req.user.id } } : false
}

export const CreatorProfiles: CollectionConfig = {
  slug: 'creator-profiles',
  labels: { singular: 'Creator profile', plural: 'Creator profiles' },
  admin: {
    group: 'People',
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'code', 'personas', '_status', 'updatedAt'],
    listSearchableFields: ['code', 'displayName'],
    description:
      'Publish a profile to verify it; unpublish to hide it. Pause, suspend and feature live in Creator listings and take effect at once.',
    components: { beforeListTable: ['/modules/admin/components/CreatorProfilesNote#CreatorProfilesNote'] },
  },
  versions: { drafts: true, maxPerDoc: 25 },
  access: {
    read: readProfiles,
    create: ({ req }) => isEditorUser(req.user) || (req.user as { accountType?: string } | null)?.accountType === 'provider',
    update: ownOrEditor,
    delete: isAdmin,
    readVersions: ownOrEditor,
  },
  hooks: {
    beforeOperation: [guardProviderPublish],
    beforeValidate: [prepareProfile],
    afterChange: [syncListing],
    afterDelete: [revalidateAfterDelete],
    beforeDelete: [
      async ({ id, req }) => {
        const briefs = await req.payload.count({ collection: 'briefs', where: { creator: { equals: id } }, req, overrideAccess: true })
        if (briefs.totalDocs) {
          throw new APIError(`This profile is still used by ${briefs.totalDocs} brief(s). Suspend it instead.`, 400, undefined, true)
        }
      },
      removeListing,
    ],
  },
  fields: [
    {
      name: 'listingLink',
      type: 'ui',
      admin: { position: 'sidebar', components: { Field: '/modules/admin/components/CreatorLinks#ProfileListingLink' } },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      unique: true,
      index: true,
      access: {
        // The owner id is private: public responses omit it (research §4).
        read: ({ req, doc }) => isEditorUser(req.user) || (Boolean(req.user) && relId(doc?.user) === String(req.user?.id)),
        update: noOne,
      },
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'code',
      type: 'text',
      unique: true,
      index: true,
      access: { update: noOne },
      admin: { position: 'sidebar', readOnly: true, description: 'Assigned once. Shown with the brand prefix from Site settings.' },
    },
    { name: 'displayName', type: 'text', required: true, localized: true, minLength: 2, maxLength: 60 },
    { name: 'bio', type: 'textarea', localized: true, maxLength: 600 },
    {
      name: 'personas',
      type: 'relationship',
      relationTo: 'personas',
      hasMany: true,
      required: true,
      minRows: 1,
      maxRows: 4,
      admin: { description: 'The first is the primary professional type.' },
    },
    { name: 'specialties', type: 'relationship', relationTo: 'categories', hasMany: true, maxRows: 12 },
    { name: 'cities', type: 'relationship', relationTo: 'locations', hasMany: true, maxRows: 12 },
    {
      name: 'languages',
      type: 'select',
      hasMany: true,
      options: SPOKEN_LANGUAGES.map((value) => ({ label: value, value })),
      validate: (value: unknown) =>
        (Array.isArray(value) ? value : []).every((v) => typeof v === 'string' && isSpokenLanguage(v)) || 'creators.languages.invalid',
    },
    // 002 FR-011: gender drives Quick Match's "shot by" (003) and is never public; nationality and experience are shown.
    {
      name: 'gender',
      type: 'select',
      options: [
        { label: 'Female', value: 'woman' },
        { label: 'Male', value: 'man' },
      ],
      access: { read: ({ req, doc }) => isEditorUser(req.user) || (Boolean(req.user) && relId(doc?.user) === String(req.user?.id)) },
      admin: { description: 'Used only to match a brief\'s "shot by" choice; never shown publicly. Required before review.' },
    },
    {
      name: 'nationality',
      type: 'text',
      validate: (value: unknown) => value == null || value === '' || isCountryCode(value) || 'creators.nationality.invalid',
      admin: { description: `ISO country code, e.g. AE (${COUNTRIES.length} allowed).` },
    },
    { name: 'yearsExperience', type: 'number', min: 0, max: MAX_YEARS_EXPERIENCE, admin: { step: 1, description: 'Whole years.' } },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    {
      name: 'samples',
      type: 'array',
      maxRows: MAX_SAMPLES,
      fields: [
        {
          name: 'kind',
          type: 'select',
          defaultValue: 'image',
          options: [
            { label: 'Image', value: 'image' },
            { label: 'Video link', value: 'video' },
          ],
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: { description: 'The picture, or the poster shown for a video link.' },
          validate: (value: unknown) => Boolean(value) || 'creators.samples.image',
        },
        {
          name: 'videoUrl',
          type: 'text',
          admin: { condition: (_data, sibling) => sibling?.kind === 'video' },
          validate: (value: unknown, { siblingData }: { siblingData?: { kind?: string } }) =>
            siblingData?.kind !== 'video' || (typeof value === 'string' && isAllowedVideoUrl(value)) || 'creators.samples.host',
        },
        { name: 'caption', type: 'text', localized: true, maxLength: 140 },
        { name: 'category', type: 'relationship', relationTo: 'categories' },
      ],
    },
    {
      name: 'social',
      type: 'array',
      maxRows: 6,
      fields: [
        { name: 'platform', type: 'select', required: true, options: SOCIAL_PLATFORMS.map((value) => ({ label: value, value })) },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: (value: unknown, { siblingData }: { siblingData?: { platform?: string } }) =>
            (typeof value === 'string' && isAllowedSocialUrl((siblingData?.platform ?? 'website') as SocialPlatform, value)) || 'creators.social.invalid',
        },
      ],
    },
  ],
}
