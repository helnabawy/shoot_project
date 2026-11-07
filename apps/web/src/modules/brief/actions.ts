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
  const message = composeMessage(config, brief.labels, brief.values, creatorText && creatorLine ? { creator: creatorText, creatorLine } : undefined)
  const whatsappUrl = buildWhatsAppLink(settings.whatsappNumber, message)
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
        context: { visitorId: visitor, ...(creator ? { creatorResolved: true } : {}) },
      })
      reference = created.reference ?? ''
    }

    if (!hasJs) redirect(whatsappUrl)
    return { status: 'ok', reference: reference ?? '', whatsappUrl, sentence, replyTime }
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
