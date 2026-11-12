import { OTP_TTL_MS } from '@shoot/domain/auth'
import { createTranslator } from 'next-intl'
import ar from '../../../../messages/ar.json'
import en from '../../../../messages/en.json'

const MESSAGES = { en, ar } as const

/**
 * The SMS body in the person's language (`auth.otp.sms`, research R11). The last line is the
 * origin-bound one-time-code format (`@shoot.ae #482713`), kept in Latin script in both languages.
 */
export function renderSms(locale: 'en' | 'ar', code: string, siteUrl: string): string {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'auth.otp' })
  return t('sms', { code, minutes: OTP_TTL_MS / 60_000, domain: new URL(siteUrl).host })
}

/** The channel's name in the person's language, for messages such as "send it by {otherChannel}". */
export function channelLabel(locale: 'en' | 'ar', channel: 'sms' | 'whatsapp'): string {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace: 'auth.otp.channels' })
  return t(channel)
}
