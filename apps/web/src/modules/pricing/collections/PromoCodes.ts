import { normalisePromoCode } from '@shoot/domain/pricing'
import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'
import { isEditor, noOne } from '@/shared/payload/access'

const normalise: CollectionBeforeValidateHook = ({ data, req }) => {
  if (data?.code === undefined) return data
  const code = normalisePromoCode(String(data.code))
  if (!code) throw new ValidationError({ collection: 'promo-codes', errors: [{ path: 'code', message: 'pricing.promo.format' }], req })
  const value = Number(data.value)
  if (data.kind === 'percent' && value > 100) throw new ValidationError({ collection: 'promo-codes', errors: [{ path: 'value', message: 'pricing.promo.percent' }], req })
  return { ...data, code }
}

/** Never publicly readable: the server checks a code a visitor types (research §4). */
export const PromoCodes: CollectionConfig = {
  slug: 'promo-codes',
  labels: { singular: 'Promo code', plural: 'Promo codes' },
  admin: { group: 'Prices', useAsTitle: 'code', defaultColumns: ['code', 'kind', 'value', 'endsAt', 'usedCount', 'active'], description: 'A code counts as used when a quotation with it is accepted.' },
  access: { read: isEditor, create: isEditor, update: isEditor, delete: isEditor },
  hooks: { beforeValidate: [normalise] },
  fields: [
    { name: 'code', type: 'text', required: true, unique: true, index: true, admin: { description: '3–20 letters or digits; stored in capitals.' } },
    { type: 'row', fields: [
      { name: 'kind', type: 'select', required: true, defaultValue: 'percent', options: [{ label: 'Percent', value: 'percent' }, { label: 'Fixed amount (AED)', value: 'fixed' }] },
      { name: 'value', type: 'number', required: true, min: 0.01, admin: { step: 0.01, description: 'Percent (1–100) or AED.' } },
    ] },
    { type: 'row', fields: [
      { name: 'startsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'endsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    ] },
    { type: 'row', fields: [
      { name: 'usageLimit', type: 'number', min: 1, admin: { description: 'Empty: unlimited.' } },
      { name: 'usedCount', type: 'number', defaultValue: 0, access: { create: noOne, update: noOne }, admin: { readOnly: true } },
    ] },
    { name: 'active', type: 'checkbox', defaultValue: true },
  ],
}
