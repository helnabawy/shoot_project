import type { CollectionConfig } from 'payload'
import { nobody } from '@/shared/payload/access'

/**
 * One sign-in code in flight (feature 009, data-model.md "OtpChallenge"). Server only: deny-all
 * access, hidden from the admin; read and written only by `modules/auth/otp/challenges.ts` with
 * `overrideAccess`. It holds keyed fingerprints, never a number or a code (FR-005).
 */
export const OtpChallenges: CollectionConfig = {
  slug: 'otp-challenges',
  admin: { hidden: true },
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  fields: [
    { name: 'publicId', type: 'text', required: true, unique: true, index: true },
    { name: 'phoneHash', type: 'text', required: true, index: true },
    { name: 'codeHash', type: 'text', required: true },
    { name: 'channel', type: 'select', required: true, options: ['sms', 'whatsapp'] },
    { name: 'locale', type: 'select', required: true, options: ['en', 'ar'] },
    { name: 'attempts', type: 'number', required: true, defaultValue: 0 },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'resendAt', type: 'date', required: true },
    { name: 'usedAt', type: 'date' },
    { name: 'supersededAt', type: 'date' },
    { name: 'providerRef', type: 'text' },
  ],
}
