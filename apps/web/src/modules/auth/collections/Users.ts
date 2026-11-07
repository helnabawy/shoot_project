import { normaliseE164 } from '@shoot/domain/contact'
import type { CollectionConfig } from 'payload'
import { countProfileReferences } from '@/modules/creators/references'
import { refuseDeleteWhileReferenced } from '@/modules/personas/collections/guards'
import { anyone, hasRole, isAdmin, isAdminField, isAdminOrSelf } from '@/shared/payload/access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Account', plural: 'Accounts' },
  admin: { group: 'People', useAsTitle: 'email', defaultColumns: ['name', 'email', 'accountType', 'roles'] },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    verify: false,
    cookies: { sameSite: 'Lax', secure: process.env.NODE_ENV === 'production' },
  },
  hooks: {
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
    create: anyone,
    read: isAdminOrSelf,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    { name: 'name', type: 'text', required: true, minLength: 2, maxLength: 80 },
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
      name: 'persona',
      type: 'relationship',
      relationTo: 'personas',
      validate: (value: unknown, { data }: { data: Partial<{ accountType: string }> }) =>
        data?.accountType !== 'provider' || Boolean(value) || 'Choose a profession for a provider account.',
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
      name: 'phone',
      type: 'text',
      validate: (value: unknown) =>
        !value || normaliseE164(String(value)) !== null || 'Use the international format, e.g. +971 58 123 4567.',
      hooks: { beforeChange: [({ value }) => (value ? (normaliseE164(String(value)) ?? value) : value)] },
    },
  ],
}
