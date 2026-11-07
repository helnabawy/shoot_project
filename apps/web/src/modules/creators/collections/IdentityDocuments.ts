import { IDENTITY_DOCUMENTS, IDENTITY_UPLOAD_TYPES, isIdentityUploadType, MAX_IDENTITY_BYTES } from '@shoot/domain/creators'
import { APIError, type Access, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { isEditorField, isEditorOrOwner, isEditorUser, noOne } from '@/shared/payload/access'
import { consumeAllowance } from '@/shared/payload/rate-limit'

/** Uploads a provider may make per hour; replacing a rejected file is the usual reason to upload again. */
const IDENTITY_UPLOADS_PER_HOUR = 10

const createIdentity: Access = ({ req }) =>
  isEditorUser(req.user) || (req.user as { accountType?: string } | null)?.accountType === 'provider'

/**
 * A provider's upload is always theirs and always waits for the check: owner and status are set here,
 * before validation, whatever the request says. Type, size and rate are checked before the file is stored.
 */
const prepareIdentity: CollectionBeforeValidateHook = async ({ data, req, operation }) => {
  if (operation !== 'create' || !req.user || isEditorUser(req.user)) return data
  const file = req.file
  if (!file || !isIdentityUploadType(file.mimetype)) throw new APIError('creators.identity.type', 400, undefined, true)
  const bytes = Math.max(file.size ?? 0, file.data?.length ?? 0)
  if (bytes > MAX_IDENTITY_BYTES) throw new APIError('creators.identity.size', 400, undefined, true)
  await consumeAllowance(req, `identity:user:${req.user.id}`, IDENTITY_UPLOADS_PER_HOUR, 'creators.identity.tooMany')
  return { ...data, user: req.user.id, status: 'pending', note: null }
}

/** An editor changing the status stamps when it was reviewed. */
const stampReview: CollectionBeforeChangeHook = ({ data, originalDoc, operation }) =>
  operation === 'update' && data.status !== undefined && data.status !== originalDoc?.status ? { ...data, reviewedAt: new Date().toISOString() } : data

/**
 * CP-FR-013: the Emirates ID and trade license a creator sends before review. Confidential: only the
 * owner and editors can read a record or open its file (the file is served through this access, never
 * from a public folder), only editors change the status, and providers never delete (a new upload replaces
 * the old one on the server's side).
 */
export const IdentityDocuments: CollectionConfig = {
  slug: 'identity-documents',
  labels: { singular: 'Identity document', plural: 'Identity documents' },
  admin: {
    group: 'People',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'kind', 'user', 'status', 'createdAt'],
    description:
      'Emirates IDs and trade licenses sent by creators. Confidential: never shown on the site. Mark each one Verified or Not accepted (with a note the creator will read); a profile can be sent for review only when both are uploaded and not rejected.',
  },
  access: {
    read: isEditorOrOwner('user'),
    create: createIdentity,
    update: ({ req }) => isEditorUser(req.user),
    delete: ({ req }) => isEditorUser(req.user),
  },
  defaultSort: '-createdAt',
  hooks: { beforeValidate: [prepareIdentity], beforeChange: [stampReview] },
  upload: {
    mimeTypes: [...IDENTITY_UPLOAD_TYPES],
    // No resized copies: the file is read by a person once, as uploaded.
    imageSizes: [],
    adminThumbnail: () => null,
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      index: true,
      options: IDENTITY_DOCUMENTS.map((value) => ({ label: value === 'emirates-id' ? 'Emirates ID' : 'Trade license', value })),
      access: { update: isEditorField },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Waiting for the check', value: 'pending' },
        { label: 'Verified', value: 'verified' },
        { label: 'Not accepted', value: 'rejected' },
      ],
      access: { create: isEditorField, update: isEditorField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'note',
      type: 'textarea',
      maxLength: 300,
      access: { create: isEditorField, update: isEditorField },
      admin: { position: 'sidebar', description: 'Shown to the creator when a document is not accepted: say what to send instead.' },
    },
    { name: 'reviewedAt', type: 'date', access: { create: noOne, update: noOne }, admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      access: { update: noOne },
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
