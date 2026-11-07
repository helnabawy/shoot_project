import { briefLabelsFrom } from '@/modules/brief/labels'
import ar from '../../messages/ar.json'
import en from '../../messages/en.json'

const MESSAGES = { en, ar } as const

/** Looks up a dotted key in the message files, like next-intl's t.raw on the server. */
export function lookup(locale: 'en' | 'ar', key: string): string {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], MESSAGES[locale])
  if (typeof value !== 'string') throw new Error(`missing message ${key}`)
  return value
}

export const testBriefLabels = (locale: 'en' | 'ar' = 'en') => briefLabelsFrom((k) => lookup(locale, k))

export const themeLabels = (locale: 'en' | 'ar' = 'en') => ({
  label: lookup(locale, 'theme.label'),
  light: lookup(locale, 'theme.light'),
  dark: lookup(locale, 'theme.dark'),
  system: lookup(locale, 'theme.system'),
})
