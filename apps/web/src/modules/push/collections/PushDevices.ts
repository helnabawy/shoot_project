import type { CollectionConfig } from 'payload'
import { isAdmin, nobody } from '@/shared/payload/access'

/** One app installation registered for push by one member (feature 019, data-model.md). Server-only writes. */
export const PushDevices: CollectionConfig = {
  slug: 'push-devices',
  labels: { singular: 'Push device', plural: 'Push devices' },
  admin: { group: 'Bookings', useAsTitle: 'platform', defaultColumns: ['user', 'platform', 'locale', 'lastSeenAt'], description: 'Phones that receive app notifications.' },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  defaultSort: '-lastSeenAt',
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true, admin: { readOnly: true } },
    // The FCM registration token; never shown in the admin list.
    { name: 'token', type: 'text', required: true, unique: true, maxLength: 4096, admin: { readOnly: true, hidden: true } },
    {
      name: 'platform',
      type: 'select',
      required: true,
      options: [
        { label: 'iOS', value: 'ios' },
        { label: 'Android', value: 'android' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'locale',
      type: 'select',
      required: true,
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: 'العربية', value: 'ar' },
      ],
      admin: { readOnly: true },
    },
    { name: 'lastSeenAt', type: 'date', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
  ],
}
