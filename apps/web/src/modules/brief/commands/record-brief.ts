import 'server-only'
import { briefFingerprint } from '@shoot/domain/brief'
import { buildWhatsAppLink } from '@shoot/domain/contact'
import type { BriefReceiptV1, BriefRecordV1 } from '@shoot/domain/api/v1'
import { getTranslations } from 'next-intl/server'
import type { ActorContext } from '@/shared/api/actor'
import { problem, type Problem } from '@/shared/api/problem'
import { errorStatus } from '@/shared/payload/errors'
import { accessKey, newSalt } from '../../booking/keys'
import { getSiteSettings } from '../../site-settings/queries'
import { getBriefBuilderConfig } from '../queries'
import { composeMessage, composeSentence, resolveBrief } from '../submit'
import { PROBLEM_FOR, toAnswers } from './brief-answers'

const DUPLICATE_WINDOW_MS = 60_000

/** The sourcePath a brief recorded by the app carries (spec 010 data-model). */
export const APP_SOURCE_PATH = '/app/landing'

/**
 * `POST briefs` (feature 010): validates against the CMS builder, then records the brief the way the
 * website's server action does (duplicate window, hourly allowance through the `briefs` hook, Quick
 * Match link). The visitor is the install id (`ctx.visitorKey`), the member the Bearer token.
 */
export async function recordBrief(ctx: ActorContext, input: BriefRecordV1): Promise<BriefReceiptV1 | Problem> {
  const { payload, locale } = ctx
  const [config, settings] = await Promise.all([getBriefBuilderConfig(locale), getSiteSettings(locale)])
  if (!config) return problem(503, 'brief.errors.generic')

  const mapped = toAnswers(config, input)
  if (!mapped.ok) {
    return problem(422, 'brief.errors.optionGone', { fields: [{ path: `body.selections.${mapped.token}`, code: 'brief.errors.optionGone' }] })
  }
  const parsed = resolveBrief(config, mapped.answers)
  if (!parsed.ok) {
    const [token, key] = Object.entries(parsed.errors)[0] as [string, string]
    const code = PROBLEM_FOR[key] ?? 'brief.errors.optionGone'
    const path = key.startsWith('brief.errors.date') ? 'body.date' : `body.selections.${token}`
    return problem(422, code, { fields: [{ path, code }] })
  }
  const { brief } = parsed

  const selections = config.slots.map((slot) => ({
    token: slot.token,
    value: brief.values[slot.token] ?? '',
    label: brief.labels[slot.token] ?? '',
    custom: brief.custom[slot.token] ?? false,
  }))
  const sentence = composeSentence(config, brief.labels, brief.values)
  const fingerprint = briefFingerprint(selections, ctx.visitorKey)

  try {
    const recent = await payload.find({
      collection: 'briefs',
      where: { and: [{ fingerprint: { equals: fingerprint } }, { createdAt: { greater_than: new Date(ctx.now().getTime() - DUPLICATE_WINDOW_MS).toISOString() } }] },
      limit: 1,
      depth: 0,
    })
    let reference = recent.docs[0]?.reference ?? null
    const quickMatch = settings.quickMatch?.enabled === true
    const salt = quickMatch ? newSalt() : null

    if (reference && salt) {
      // A replayed brief keeps its record but gets a fresh working link.
      await payload.update({ collection: 'briefs', id: recent.docs[0]!.id, data: { accessSalt: salt } as never, overrideAccess: true, context: { disableRevalidate: true } })
    }

    if (!reference) {
      const slugs = brief.personaSlugs
      const found = slugs.length ? (await payload.find({ collection: 'personas', where: { slug: { in: slugs } }, limit: slugs.length, depth: 0 })).docs : []
      const personaIds = slugs.map((slug) => found.find((p) => p.slug === slug)?.id).filter((id) => id != null)
      if (!personaIds.length || personaIds.length !== slugs.length) {
        const token = config.slots.find((s) => s.kind === 'persona')?.token ?? 'persona'
        return problem(422, 'brief.errors.optionGone', { fields: [{ path: `body.selections.${token}`, code: 'brief.errors.optionGone' }] })
      }
      const created = await payload.create({
        collection: 'briefs',
        data: { persona: personaIds, selections, date: brief.date, sentence, locale, sourcePath: APP_SOURCE_PATH, website: '' },
        overrideAccess: false,
        user: ctx.user ?? undefined,
        context: { visitorId: ctx.visitorKey, ...(salt ? { accessSalt: salt } : {}) },
      })
      reference = created.reference ?? ''
    }

    const referenceLine = reference ? (await getTranslations({ locale, namespace: 'brief' }))('whatsappReference', { reference }) : null
    const message = composeMessage(config, brief.labels, brief.values, undefined, reference && referenceLine ? { reference, referenceLine } : undefined)
    return {
      reference: reference ?? '',
      sentence,
      whatsappUrl: buildWhatsAppLink(settings.whatsappNumber, message) || null,
      matchPath: salt && reference ? `/match/${reference}/${accessKey(salt, 'brief')}` : null,
    }
  } catch (error) {
    if (errorStatus(error) === 429) return problem(429, 'brief.errors.tooMany')
    if (errorStatus(error) === 400) return problem(503, 'brief.errors.generic')
    throw error
  }
}
