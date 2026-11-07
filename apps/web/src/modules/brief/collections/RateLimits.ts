import type { CollectionConfig } from 'payload'
import { nobody } from '@/shared/payload/access'

/** Internal counter for anonymous brief submissions (FR-050). Never exposed. */
export const RateLimits: CollectionConfig = {
  slug: 'rate-limits',
  admin: { hidden: true },
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'count', type: 'number', required: true, defaultValue: 0 },
    { name: 'windowStart', type: 'date', required: true, index: true },
  ],
}
