import { LEGAL_KINDS } from '@shoot/domain/pages'
import type { Access, CollectionConfig } from 'payload'
import { hasRole, isAdmin, nobody } from '@/shared/payload/access'

/** A member sees their own rows; admins see all. Editors do not (account data). */
const ownOrAdmin: Access = ({ req }) => {
  if (hasRole(req.user as never, 'admin')) return true
  return req.user ? { user: { equals: req.user.id } } : false
}

/**
 * Which version of each legal document an account accepted, and when (FR-007). Append-only:
 * the register action writes rows with the Local API; nobody can create or change them over the API.
 */
export const LegalAcceptances: CollectionConfig = {
  slug: 'legal-acceptances',
  labels: { singular: 'Legal acceptance', plural: 'Legal acceptances' },
  admin: { group: 'People', defaultColumns: ['user', 'kind', 'version', 'acceptedAt'] },
  access: { read: ownOrAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'kind', type: 'select', required: true, options: LEGAL_KINDS.map((value) => ({ label: value, value })) },
    { name: 'version', type: 'number', required: true },
    { name: 'acceptedAt', type: 'date', required: true },
    { name: 'locale', type: 'select', required: true, options: [{ label: 'English', value: 'en' }, { label: 'Arabic', value: 'ar' }] },
  ],
}
