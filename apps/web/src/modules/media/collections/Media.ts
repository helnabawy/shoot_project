import { ACCEPTED_UPLOAD_TYPES, MAX_FILES_PER_ACCOUNT, MAX_UPLOAD_BYTES, UPLOADS_PER_ACCOUNT_HOUR, UPLOADS_PER_VISITOR_HOUR } from '@shoot/domain/creators'
import { APIError, type Access, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'
import { refuseDeleteWhileReferenced } from '@/modules/personas/collections/guards'
import { anyone, isEditorField, isEditorUser, noOne } from '@/shared/payload/access'
import { revalidateTagAfterChange, revalidateTagAfterDelete } from '@/shared/payload/hooks/revalidate'
import { consumeAllowance, visitorKey } from '@/shared/payload/rate-limit'
import { mediaContentReferences } from '@/modules/guides/references'
import { countProfileReferences } from '@/modules/creators/references'

const createMedia: Access = ({ req }) =>
  isEditorUser(req.user) || (req.user as { accountType?: string } | null)?.accountType === 'provider'

/** Editors manage the whole library; a provider only the files they uploaded. */
const ownOrEditor: Access = ({ req }) => {
  if (isEditorUser(req.user)) return true
  return req.user ? { uploadedBy: { equals: req.user.id } } : false
}

/**
 * Records who uploaded a file. Provider uploads are bounded by type, size, a per-account file quota
 * and hourly rate limits per account and per visitor (research §6, CP-FR-008). Editors are never limited.
 */
const checkUpload: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== 'create' || !req.user) return data
  const next = { ...data, uploadedBy: req.user.id }
  if (isEditorUser(req.user)) return next

  const file = req.file
  if (!file || !(ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(file.mimetype)) {
    throw new APIError('media.upload.type', 400, undefined, true)
  }
  // `size` is not always set once Payload has read the upload; the buffer length is the truth.
  const bytes = Math.max(file.size ?? 0, file.data?.length ?? 0)
  if (bytes > MAX_UPLOAD_BYTES) throw new APIError('media.upload.size', 400, undefined, true)

  const owned = await req.payload.count({ collection: 'media', where: { uploadedBy: { equals: req.user.id } }, req, overrideAccess: true })
  if (owned.totalDocs >= MAX_FILES_PER_ACCOUNT) throw new APIError('media.upload.quota', 400, undefined, true)

  await consumeAllowance(req, `upload:user:${req.user.id}`, UPLOADS_PER_ACCOUNT_HOUR, 'media.upload.tooMany')
  await consumeAllowance(req, `upload:visitor:${visitorKey(req)}`, UPLOADS_PER_VISITOR_HOUR, 'media.upload.tooMany')
  return next
}

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Image', plural: 'Images' },
  access: { read: anyone, create: createMedia, update: ownOrEditor, delete: ownOrEditor },
  admin: { group: 'Content', description: 'Images used on the site. Alternative text is required in English.' },
  hooks: {
    beforeChange: [checkUpload],
    afterChange: [revalidateTagAfterChange('media')],
    afterDelete: [revalidateTagAfterDelete('media')],
    beforeDelete: [
      refuseDeleteWhileReferenced(async ({ id, req }) => {
        const profiles = await countProfileReferences(req, { or: [{ photo: { equals: id } }, { 'samples.image': { equals: id } }] })
        const content = await mediaContentReferences(req, id)
        return [...(profiles ? [`${profiles} creator profile(s)`] : []), ...content]
      }),
    ],
  },
  upload: {
    mimeTypes: ['image/*'],
    focalPoint: true,
    imageSizes: [
      { name: 'thumbnail', width: 400, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'card', width: 800, formatOptions: { format: 'webp', options: { quality: 80 } } },
      { name: 'hero', width: 1600, formatOptions: { format: 'webp', options: { quality: 80 } } },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      localized: true,
      admin: { description: 'Describe the image for people who cannot see it. Use "" only for decoration.' },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      access: { read: isEditorField, update: noOne },
      admin: { position: 'sidebar', readOnly: true, description: 'Set automatically.' },
    },
  ],
}
