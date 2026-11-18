import 'server-only'
import type { CreatorHomeV1, HomeItemV1 } from '@shoot/domain/api/v1'
import { buildQueue, homeCounts, homeMode, todayState } from '@shoot/domain/account'
import type { Payload } from 'payload'
import { creatorAvailability, homeRequests, type HomeRequest } from '@/modules/booking'
import { getDirectoryContext, readMyCreatorProfile } from '@/modules/creators'
import { creatorInbox, occasionsOf } from '@/modules/inbox'
import type { ActorContext } from '@/shared/api/actor'
import { isProblem, problem, type Problem } from '@/shared/api/problem'
import type { Locale } from '@/shared/lib/locale'

/**
 * The creator home (feature 023): one read for the screen, built from the creator's own bookings, the open
 * briefs that match them and their availability, with the rules those features already have. Nothing here
 * writes, and nothing reads another creator's data or a client's contact details.
 */

const DURATION_SET = 'durations'
const day = /^\d{4}-\d{2}-\d{2}$/

/** "9:30" and "09:30" both read as "09:30"; anything else is not a time. */
function timeOf(value: string | null): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value ?? '')
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : null
}

/** The length options' labels in the request language, from the content area. */
async function durationLabels(payload: Payload, locale: Locale): Promise<Map<string, string>> {
  const set = (await payload.find({ collection: 'option-sets', where: { slug: { equals: DURATION_SET } }, limit: 1, depth: 0, locale, fallbackLocale: 'en', overrideAccess: true })).docs[0]
  return new Map((set?.options ?? []).map((o) => [o.value, o.label]))
}

export async function creatorHome(ctx: ActorContext): Promise<CreatorHomeV1 | Problem> {
  const user = ctx.user?.accountType === 'provider' ? ctx.user : null
  if (!user) return problem(403, 'creators.errors.notProvider')

  const profile = await readMyCreatorProfile(ctx)
  if (isProblem(profile)) return profile
  const mode = homeMode(profile.status)
  const inboxCtx = { payload: ctx.payload, locale: ctx.locale, now: ctx.now() }

  const [directory, availability] = await Promise.all([getDirectoryContext(ctx.locale), creatorAvailability(ctx)])
  const today = isProblem(availability) ? 'free' : todayState(availability.days, availability.today)
  const identity = {
    name: profile.fields.displayName.en && ctx.locale === 'en' ? profile.fields.displayName.en : profile.fields.displayName.ar || profile.fields.displayName.en || (user.name ?? ''),
    code: profile.code || null,
    professions: profile.fields.professions.map((id) => directory.lookups.personas.get(id)).filter((n): n is string => Boolean(n)),
    photo: profile.photo,
  }

  if (mode !== 'live') {
    const needs = mode === 'incomplete' ? profile.steps.filter((s) => s.required.length || s.recommended.length).map((s) => ({ step: s.key, required: s.required, recommended: s.recommended })) : []
    return { ...identity, mode, needs, queue: [], next: null, today, reasons: [] }
  }

  const [requests, inbox, durations] = await Promise.all([homeRequests(ctx, user), creatorInbox(inboxCtx, user.id), durationLabels(ctx.payload, ctx.locale)])
  const occasions = await occasionsOf(
    inboxCtx,
    [...requests.waiting, ...requests.upcoming].flatMap((r) => (r.brief ? [r.brief] : [])),
  )
  const occasionOf = (r: HomeRequest) => (r.brief ? (occasions.get(r.brief.id) ?? '') : '')
  const lengthOf = (r: HomeRequest) => (r.duration ? (durations.get(r.duration) ?? null) : null)

  const bookingItems = requests.waiting.map(
    (r): Extract<HomeItemV1, { kind: 'booking' }> => ({
      kind: 'booking',
      ref: r.ref,
      occasion: occasionOf(r),
      emirate: r.emirate,
      profession: r.profession,
      date: day.test(r.date) ? r.date : null,
      time: timeOf(r.time),
      length: lengthOf(r),
      client: r.client,
      respondBy: r.respondBy as string,
    }),
  )
  const briefItems = (inbox?.open ?? []).map(
    (b): Extract<HomeItemV1, { kind: 'brief' }> => ({
      kind: 'brief',
      ref: b.ref,
      persona: b.persona,
      occasion: b.occasion,
      emirate: b.emirate,
      profession: b.profession,
      date: b.date,
      sentAt: b.sentAt,
      ...(b.budgetFils ? { budgetFils: b.budgetFils } : {}),
    }),
  )
  const queue = buildQueue(bookingItems, briefItems)
  const upNext = requests.upcoming.find((r) => day.test(r.date))

  return {
    ...identity,
    mode,
    needs: [],
    counts: homeCounts(queue, requests.upcoming.length, requests.done.length),
    queue,
    next: upNext
      ? { ref: upNext.ref, quotation: upNext.quotation, occasion: occasionOf(upNext), emirate: upNext.emirate, date: upNext.date, time: timeOf(upNext.time), length: lengthOf(upNext), paid: upNext.paid }
      : null,
    today,
    reasons: inbox?.reasons ?? [],
  }
}
