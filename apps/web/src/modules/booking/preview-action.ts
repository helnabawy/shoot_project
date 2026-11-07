'use server'

import { getTranslations } from 'next-intl/server'
import { getDirectoryContext } from '@/modules/creators'
import { getSiteSettings } from '@/modules/site-settings/queries'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { briefFromAnswers, getMatchPage } from './match'
import { readQuickMatch } from './settings'
import { matchView } from './views'

export interface PreviewCreator {
  /** Submitted with the brief as `pick` to go straight to step 3 with this creator. */
  pick: string
  code: string
  displayCode: string
  name: string
  initials: string
  photo: { url: string; alt: string } | null
  meta: string
}

export interface MatchPreview {
  sections: { persona: string; plural: string; price: string | null; total: number; creators: PreviewCreator[] }[]
}

const PREVIEW_ROWS = 3

/**
 * The brief bar's preview (US1-S7, FR-014): who is free for the answers so far, with the one price. Read-only:
 * nothing is saved until the visitor acts. Null when Quick Match is off or the answers name no professional.
 */
export async function previewMatches(input: { locale: string; values: Record<string, string>; custom: Record<string, boolean> }): Promise<MatchPreview | null> {
  const locale: Locale = isLocale(input.locale) ? input.locale : 'en'
  const values = Object.fromEntries(Object.entries(input.values ?? {}).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), String(v ?? '')]))
  const custom = Object.fromEntries(Object.entries(input.custom ?? {}).slice(0, 20).map(([k, v]) => [String(k).slice(0, 40), Boolean(v)]))
  const payload = await getPayloadClient()
  if (!(await readQuickMatch(payload)).enabled) return null
  const brief = await briefFromAnswers({ values, custom }, locale)
  if (!brief) return null
  const now = new Date()
  const date = brief.date ? String(brief.date) : null
  const [page, ctx, settings, t] = await Promise.all([
    getMatchPage(brief, locale, now, { date }),
    getDirectoryContext(locale),
    getSiteSettings(locale),
    getTranslations({ locale, namespace: 'creators.profile' }),
  ])
  const view = matchView(page, { ref: '', key: '', locale, picks: [], date, ctx, settings, sentence: '', experience: (count) => t('experienceYears', { count }) })
  return {
    sections: view.sections.map((s, i) => {
      const slug = page.sections[i]?.persona.slug ?? ''
      return {
        persona: slug,
        plural: s.plural,
        price: s.price,
        total: s.creators.length,
        creators: s.creators.slice(0, PREVIEW_ROWS).map((c) => ({
          pick: `${slug}:${c.code}`,
          code: c.code,
          displayCode: c.displayCode,
          name: c.name,
          initials: c.initials,
          photo: c.photo ? { url: c.photo.url, alt: c.photo.alt } : null,
          meta: c.meta,
        })),
      }
    }),
  }
}
