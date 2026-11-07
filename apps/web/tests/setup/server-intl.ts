import ar from '../../messages/ar.json'
import en from '../../messages/en.json'
import { lookup } from '../fixtures/labels'

/** Stand-ins for next-intl/server that read the real message files. */
let requestLocale: 'en' | 'ar' = 'en'

export function setRequestLocale(locale: string) {
  requestLocale = locale === 'ar' ? 'ar' : 'en'
}

export async function getMessages() {
  return requestLocale === 'ar' ? ar : en
}

export async function getTranslations(arg?: { locale?: string; namespace?: string } | string) {
  const options = typeof arg === 'string' ? { namespace: arg } : (arg ?? {})
  const locale = options.locale === 'ar' || options.locale === 'en' ? options.locale : requestLocale
  const full = (key: string) => (options.namespace ? `${options.namespace}.${key}` : key)
  const t = (key: string, values: Record<string, unknown> = {}) =>
    lookup(locale, full(key)).replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`))
  t.raw = (key: string) => lookup(locale, full(key))
  return t
}
