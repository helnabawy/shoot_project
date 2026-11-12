import { normaliseE164 } from '@shoot/domain/contact'
import { APIError, type CollectionConfig, type FieldAccess } from 'payload'
import { countProfileReferences } from '@/modules/creators/references'
import { MAX_PROVIDER_PERSONAS } from '@shoot/domain/auth'
import { refuseDeleteWhileReferenced } from '@/modules/personas/collections/guards'
import { hasRole, isAdmin, isAdminField, isAdminOrSelf } from '@/shared/payload/access'

/** The member themself or an admin: who may read the sign-in and contact numbers (FR-025, FR-033). */
const selfOrAdminField: FieldAccess = ({ req, doc, id }) =>
  hasRole(req.user as never, 'admin') || (req.user?.collection === 'users' && String(req.user.id) === String(doc?.id ?? id))

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Account', plural: 'Accounts' },
  admin: { group: 'People', useAsTitle: 'name', defaultColumns: ['name', 'username', 'email', 'accountType', 'roles'] },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    verify: false,
    // Feature 009 (research R1): a code-verified UAE mobile number is the `username`; email stays the
    // editors' sign-in and becomes optional. Password login accepts email only (hook below).
    loginWithUsername: { allowEmailLogin: true, requireEmail: false, requireUsername: false },
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  hooks: {
    // FR-016: code accounts are unreachable by password, so /api/users/login can neither guess nor
    // lock them; a login by `username` is refused before Payload counts an attempt.
    beforeOperation: [
      ({ operation, args }) => {
        if (operation === 'login' && (args as { data?: { username?: unknown } }).data?.username !== undefined) {
          throw new APIError('auth.errors.invalid', 401, undefined, true)
        }
        return args
      },
    ],
    // A creator profile keeps its owner; an admin suspends the profile instead of deleting the account.
    beforeDelete: [
      refuseDeleteWhileReferenced(async ({ id, req }) => {
        const profiles = await countProfileReferences(req, { user: { equals: id } })
        return profiles ? ['a creator profile'] : []
      }),
    ],
  },
  access: {
    // Admins and editors may open /admin (FR-016).
    admin: ({ req }) => hasRole(req.user as never, 'admin', 'editor'),
    // Feature 009 (research R18): no public endpoint creates users; the code commands use overrideAccess.
    create: isAdmin,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      // The verified sign-in number (E.164), Payload's username field overridden: written only by
      // server code with overrideAccess (verify-code, link-number), read by the member and admins (FR-017).
      name: 'username',
      label: 'Sign-in number',
      type: 'text',
      unique: true,
      index: true,
      access: { create: () => false, update: () => false, read: selfOrAdminField },
      admin: { readOnly: true, position: 'sidebar', description: 'Verified by a one-time code. Empty for email accounts.' },
    },
    // Optional since feature 009: a code account starts without a name (FR-014).
    { name: 'name', type: 'text', minLength: 2, maxLength: 80 },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      defaultValue: ['member'],
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Member', value: 'member' },
      ],
      // Members can never grant themselves a role, even through the public create endpoint (US4-S7).
      access: { create: isAdminField, update: isAdminField },
      admin: { position: 'sidebar' },
    },
    {
      name: 'accountType',
      type: 'select',
      required: true,
      defaultValue: 'seeker',
      options: [
        { label: 'Needs a professional (seeker)', value: 'seeker' },
        { label: 'Is a professional (provider)', value: 'provider' },
      ],
    },
    {
      // A provider may offer several professional types (e.g. "Both" at registration); the first is
      // the primary one. Their profile starts with all of them.
      name: 'persona',
      label: 'Professions',
      type: 'relationship',
      relationTo: 'personas',
      hasMany: true,
      maxRows: MAX_PROVIDER_PERSONAS,
      validate: (value: unknown, { data }: { data: Partial<{ accountType: string }> }) =>
        data?.accountType !== 'provider' ||
        (Array.isArray(value) && value.length > 0) ||
        'Choose at least one profession for a provider account.',
      admin: { condition: (data) => data?.accountType === 'provider' },
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { condition: (data) => data?.accountType === 'provider' },
    },
    {
      // Unverified contact number (booking details); never used to find an account (FR-013).
      name: 'phone',
      type: 'text',
      access: { read: selfOrAdminField },
      validate: (value: unknown) =>
        !value || normaliseE164(String(value)) !== null || 'Use the international format, e.g. +971 58 123 4567.',
      hooks: { beforeChange: [({ value }) => (value ? (normaliseE164(String(value)) ?? value) : value)] },
    },
  ],
}
