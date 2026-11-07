/**
 * Spoken-language codes a creator can list. Names are never stored: the UI renders them with
 * Intl.DisplayNames for the visitor's language (research §10). Adding a code is a reviewed edit.
 */
export const SPOKEN_LANGUAGES = ['en', 'ar', 'hi', 'ur', 'fr', 'ru', 'tl', 'fa', 'es', 'de', 'zh', 'bn', 'ml', 'ta'] as const

export type SpokenLanguage = (typeof SPOKEN_LANGUAGES)[number]

export function isSpokenLanguage(code: string): code is SpokenLanguage {
  return (SPOKEN_LANGUAGES as readonly string[]).includes(code)
}
