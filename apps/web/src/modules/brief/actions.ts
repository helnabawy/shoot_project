'use server'

import { briefFingerprint } from '@shoot/domain/brief'
import { buildWhatsAppLink } from '@shoot/domain/contact'
import { formatCreatorCode } from '@shoot/domain/creators'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { isLocale, type Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'
import { errorStatus } from '@/shared/payload/errors'
import { accessKey, newSalt } from '../booking/keys'
import { formatPicks, parsePicks } from '@shoot/domain/booking'
import { detailsPath, matchPath } from '../booking/paths'
import { getCurrentUser } from '../auth/session'
import { getCreatorByCode } from '../creators'
import { getActivePersonas } from '../personas/queries'
import { getSiteSettings } from '../site-settings/queries'
import { fillCreatorPersona, personasOutside } from './creator'
import { getBriefBuilderConfig } from './queries'
import { composeMessage, composeSentence, parseBrief } from './submit'
import type { BriefState } from './types'

const VISITOR_COOKIE = 'sp_vid'
const DUPLICATE_WINDOW_MS = 60_000

async function visitorId(): Promise<string> {
  const jar = await cookies()
  const existing = jar.get(VISITOR_COOKIE)?.value
  if (existing) return existing
  const id = crypto.randomUUID()
  jar.set(VISITOR_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  return id
}

/** Records a brief and hands the visitor to WhatsApp (FR-049, FR-050, FR-055). */
export async function submitBrief(_prev: BriefState, form: FormData): Promise<BriefState> {
  const localeValue = String(form.get('locale') ?? 'en')
  const locale: Locale = isLocale(localeValue) ? localeValue : 'en'
  const hasJs = form.get('js') === '1'

  const [config, settings] = await Promise.all([getBriefBuilderConfig(locale), getSiteSettings(locale)])
  if (!config) return { status: 'error', errors: {}, formError: 'brief.errors.generic' }

  // A brief for a creator (feature 002): the code is resolved here, never trusted. A creator who cannot
  // be booked (hidden, or none of their types is on offer) is ignored and the brief goes out as a normal one.
  const creatorCode = String(form.get('creator') ?? '').trim()
  const found = creatorCode ? await getCreatorByCode(creatorCode, locale) : null
  const creator = found?.canBook ? found.creator : null
  const allowed = creator
    ? (await getActivePersonas(locale)).filter((p) => creator.personaIds.includes(p.id)).map((p) => p.slug)
    : []

  const parsed = parseBrief(config, creator ? fillCreatorPersona(form, config, allowed) : form)
  if (!parsed.ok) return { status: 'error', errors: parsed.errors }
  const { brief } = parsed
  if (creator && personasOutside(brief.personaSlugs, allowed).length) {
    const token = config.slots.find((s) => s.kind === 'persona')?.token ?? 'persona'
    return { status: 'error', errors: { [token]: 'brief.errors.creatorPersona' } }
  }

  const payload = await getPayloadClient()
  const [user, visitor] = await Promise.all([getCurrentUser(), visitorId()])
  const selections = config.slots.map((slot) => ({
    token: slot.token,
    value: brief.values[slot.token] ?? '',
    label: brief.labels[slot.token] ?? '',
    custom: brief.custom[slot.token] ?? false,
  }))
  const sentence = composeSentence(config, brief.labels, brief.values)
  const creatorText = creator ? `${creator.displayName} (${formatCreatorCode(settings.creatorCodePrefix ?? 'CR', creator.code)})` : null
  const creatorLine = creatorText ? (await getTranslations({ locale, namespace: 'creators.booking' }))('whatsappLine', { creator: creatorText }) : null
  const replyTime = settings.expectedReplyTime ?? ''

  try {
    // Two briefs to different creators are not duplicates, even with the same selections.
    const fingerprint = briefFingerprint(creator ? [...selections, { token: 'creator', value: creator.code }] : selections, visitor)
    const recent = await payload.find({
      collection: 'briefs',
      where: {
        and: [{ fingerprint: { equals: fingerprint } }, { createdAt: { greater_than: new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString() } }],
      },
      limit: 1,
      depth: 0,
    })
    let reference = recent.docs[0]?.reference ?? null
    // Quick Match (feature 003): the brief gets a private link to step 2 (research §1–§2).
    const quickMatch = settings.quickMatch?.enabled === true
    const salt = quickMatch ? newSalt() : null

    if (reference && salt) {
      // A replayed brief keeps its record but gets a fresh working link.
      await payload.update({ collection: 'briefs', id: recent.docs[0]!.id, data: { accessSalt: salt } as never, overrideAccess: true, context: { disableRevalidate: true } })
    }

    if (!reference) {
      const slugs = brief.personaSlugs
      const found = slugs.length
        ? (await payload.find({ collection: 'personas', where: { slug: { in: slugs } }, limit: slugs.length, depth: 0 })).docs
        : []
      // Stored in the order the visitor picked them (FR-063).
      const personaIds = slugs.map((slug) => found.find((p) => p.slug === slug)?.id).filter((id) => id != null)
      if (!personaIds.length || personaIds.length !== slugs.length) return { status: 'error', errors: { persona: 'brief.errors.required' } }
      const created = await payload.create({
        collection: 'briefs',
        data: {
          persona: personaIds,
          selections,
          date: brief.date,
          sentence,
          locale,
          creator: creator ? Number(creator.id) : undefined,
          sourcePath: String(form.get('sourcePath') ?? '/').slice(0, 200),
          website: String(form.get('website') ?? ''),
        },
        overrideAccess: false,
        user: user ?? undefined,
        // `creatorResolved` lets the briefs hook keep the creator; REST callers cannot set it.
        context: { visitorId: visitor, ...(creator ? { creatorResolved: true } : {}), ...(salt ? { accessSalt: salt } : {}) },
      })
      reference = created.reference ?? ''
      // 019 (US5): matching creators hear about a new brief, after the response.
      await (await import('@/modules/inbox')).announceLater(payload, created.id)
    }

    // The brief ID goes in the message so the team can find the brief from the chat (FR-055).
    const referenceLine = reference ? (await getTranslations({ locale, namespace: 'brief' }))('whatsappReference', { reference }) : null
    const message = composeMessage(
      config,
      brief.labels,
      brief.values,
      creatorText && creatorLine ? { creator: creatorText, creatorLine } : undefined,
      reference && referenceLine ? { reference, referenceLine } : undefined,
    )
    const whatsappUrl = buildWhatsAppLink(settings.whatsappNumber, message)

    // Quick Match (feature 003): continue to step 2 when it is on; WhatsApp stays the secondary action.
    // A creator chosen in the bar (US1-S7): straight to step 3 for a one-type brief, else step 2 with the choice kept.
    const picks = parsePicks(String(form.get('pick') ?? ''))?.filter((p) => brief.personaSlugs.includes(p.persona)) ?? []
    const step2 = salt && reference ? matchPath(reference, accessKey(salt, 'brief'), locale) : undefined
    const matchUrl = step2 && picks.length
      ? brief.personaSlugs.length === 1
        ? detailsPath(reference!, accessKey(salt!, 'brief'), locale, formatPicks(picks))
        : `${step2}?pick=${encodeURIComponent(formatPicks(picks))}`
      : step2
    if (!hasJs) redirect(matchUrl ?? whatsappUrl)
    return { status: 'ok', reference: reference ?? '', whatsappUrl, sentence, replyTime, ...(matchUrl ? { matchUrl } : {}) }
  } catch (error) {
    if (errorStatus(error) === 429) {
      return { status: 'error', errors: {}, formError: 'brief.errors.tooMany' }
    }
    if (errorStatus(error) === 400) {
      return { status: 'error', errors: {}, formError: 'brief.errors.generic' }
    }
    throw error
  }
}
