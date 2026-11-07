import { addDays, dubaiToday } from '@shoot/domain/booking'
import type { ReactElement } from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingByRef, bookingWorld, briefFor, quoteFor, type BookingWorld } from './setup/booking'
import { asVisitor, jar, Redirect, signIn } from './setup/next-mocks'
import { createUser, getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { requestQuotation } = await import('@/modules/booking/actions')
const { applyTransition } = await import('@/modules/booking/transitions')
const matchPage = await import('@/app/(site)/[locale]/match/[ref]/[key]/page')
const detailsPage = await import('@/app/(site)/[locale]/match/[ref]/[key]/details/page')
const quotePage = await import('@/app/(site)/[locale]/q/[ref]/[key]/page')
const memberQuotePage = await import('@/app/(site)/[locale]/account/bookings/[ref]/page')
const bookingsPage = await import('@/app/(site)/[locale]/account/bookings/page')
const availabilityPage = await import('@/app/(site)/[locale]/account/availability/page')
const { MatchResults } = await import('@/modules/booking/components/MatchResults')
const { DetailsForm } = await import('@/modules/booking/components/DetailsForm')
const { QuotationView } = await import('@/modules/booking/components/QuotationView')
const { BookingStatus } = await import('@/modules/booking/components/BookingStatus')
const { CreatorBookingRow } = await import('@/modules/booking/components/CreatorBookingRow')
const { AvailabilityList } = await import('@/modules/booking/components/AvailabilityList')
const { NotificationList } = await import('@/modules/booking/components/NotificationList')

function elements(node: unknown, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((child) => elements(child, out))
  else if (node && typeof node === 'object' && 'props' in node) {
    out.push(node as ReactElement)
    const props = (node as ReactElement<Record<string, unknown>>).props
    elements(props.children, out)
    if (props.status) elements(props.status, out)
  }
  return out
}
const find = <P,>(tree: unknown, type: unknown) => elements(tree).find((e) => e.type === type) as ReactElement<P> | undefined
/** Renders an async server component element (the quotation body) one level down. */
async function expand(tree: unknown): Promise<unknown> {
  const { QuotationPage } = await import('@/modules/booking/quote-page')
  const el = elements(tree).find((e) => e.type === QuotationPage)
  return el ? (QuotationPage as (p: unknown) => Promise<unknown>)(el.props) : tree
}
async function threw(run: () => unknown) {
  try {
    await run()
  } catch (error) {
    return error
  }
  return null
}

describe('QM pages (FR-008, FR-011)', () => {
  let world: BookingWorld
  let n = 0
  const occasions = ['event', 'portrait', 'clinic', 'products', 'car', 'property', 'travel-lifestyle', 'social-media', 'food-drinks', 'music-entertainment']
  const brief = (over: Record<string, string | string[]> = {}) => briefFor(submitBrief as never, world, { occasion: occasions[n++ % occasions.length]!, ...over })
  const quote = async (pick = `photographer:${world.creators.sara!.code}`, over: Record<string, string> = {}) => quoteFor(requestQuotation as never, await brief(), { pick, ...over })
  const qProps = (q: { ref: string; key: string }, locale = 'en', search: Record<string, string> = {}) => ({ params: Promise.resolve({ locale, ref: q.ref, key: q.key }), searchParams: Promise.resolve(search) })
  const statusOf = async (q: { ref: string; key: string }, locale = 'en', search: Record<string, string> = {}) => {
    const tree = await expand(await quotePage.default(qProps(q, locale, search)))
    const view = find<Record<string, unknown>>(tree, QuotationView)!
    return { view: view.props, status: find<Record<string, unknown>>(view.props.status, BookingStatus)!.props }
  }

  beforeAll(async () => {
    world = await bookingWorld()
  })
  beforeEach(() => asVisitor())

  it('QM-US1-S1 step 2 renders the sections, metadata and a 404 for a wrong key', async () => {
    const b = await brief()
    const tree = await matchPage.default({ params: Promise.resolve({ locale: 'en', ...b }), searchParams: Promise.resolve({}) })
    const results = find<{ sections: { creators: unknown[]; price: string | null }[]; continueHref: string | null }>(tree, MatchResults)!
    expect(results.props.sections[0]!.creators.length).toBe(2)
    expect(results.props.sections[0]!.price).toMatch(/AED/)
    expect(results.props.continueHref).toBeNull()
    expect((await matchPage.generateMetadata({ params: Promise.resolve({ locale: 'en', ...b }) } as never)).robots).toMatchObject({ index: false })
    expect(String(await threw(() => matchPage.default({ params: Promise.resolve({ locale: 'en', ref: b.ref, key: 'x'.repeat(43) }), searchParams: Promise.resolve({}) })))).toContain('NEXT_NOT_FOUND')
  })

  it('several types: picks stay in the URL and Continue appears once both are chosen; a nearby date carries over', async () => {
    const b = await brief({ persona: ['photographer', 'videographer'] })
    const one = await matchPage.default({ params: Promise.resolve({ locale: 'ar', ...b }), searchParams: Promise.resolve({ pick: 'photographer:any' }) })
    expect(find<{ continueHref: string | null }>(one, MatchResults)!.props.continueHref).toBeNull()
    const date = addDays(world.date, 1)
    const both = await matchPage.default({ params: Promise.resolve({ locale: 'en', ...b }), searchParams: Promise.resolve({ pick: `photographer:any,videographer:${world.creators.vera!.code}`, date }) })
    expect(find<{ continueHref: string | null }>(both, MatchResults)!.props.continueHref).toContain(`&date=${date}`)
  })

  it('QM-US1-S3 step 3 asks the date only when the brief had none; bad picks go back to step 2', async () => {
    const dated = await brief()
    const tree = await detailsPage.default({ params: Promise.resolve({ locale: 'en', ...dated }), searchParams: Promise.resolve({ pick: 'photographer:any' }) })
    expect(find<{ needsDate: boolean; addOns: unknown[] }>(tree, DetailsForm)!.props).toMatchObject({ needsDate: false })
    const open = await brief({ date: '' })
    const anyDate = await detailsPage.default({ params: Promise.resolve({ locale: 'ar', ...open }), searchParams: Promise.resolve({ pick: 'photographer:any' }) })
    expect(find<{ needsDate: boolean }>(anyDate, DetailsForm)!.props.needsDate).toBe(true)
    expect(await threw(() => detailsPage.default({ params: Promise.resolve({ locale: 'en', ...dated }), searchParams: Promise.resolve({ pick: 'nope' }) }))).toBeInstanceOf(Redirect)
    expect((await detailsPage.generateMetadata({ params: Promise.resolve({ locale: 'en', ...dated }) } as never)).robots).toMatchObject({ index: false })
  })

  it('QM-US2-S1 the quotation page: quoted, with the promo notice, in both languages', async () => {
    const q = await quote(undefined, { promo: 'WELCOME20' })
    const { view, status } = await statusOf(q, 'en', { promo: 'applied' })
    expect(view).toMatchObject({ reference: q.ref, notice: 'Code WELCOME20 applied.', replacedBy: null })
    expect(status).toMatchObject({ state: 'quoted', canAccept: true, canCancel: false })
    const ar = await statusOf(q, 'ar', { promo: 'expired', error: 'booking.errors.not-allowed' })
    expect(ar.view.notice).toBe('انتهت صلاحية هذا الرمز.')
    expect(ar.view.error).toBeTruthy()
    expect((await quotePage.generateMetadata({ params: Promise.resolve({ locale: 'en', ...q }) } as never)).title).toBe(`Quotation ${q.ref}`)
    expect(String(await threw(() => quotePage.default(qProps({ ref: q.ref, key: 'x'.repeat(43) }))))).toContain('NEXT_NOT_FOUND')
  })

  it('QM-US3 each state shows its one action: accepted with replacements, confirmed with payment, delivered, expired', async () => {
    const payload = await getTestPayload()
    const q = await quote()
    const booking = await bookingByRef(payload, q.ref)
    await applyTransition(payload, booking.id, 'accept', { actor: 'client', now: new Date() })
    await payload.update({ collection: 'bookings', id: booking.id, data: { assignments: booking.assignments!.map((a) => ({ ...a, status: 'declined' })) } as never, overrideAccess: true, context: { bookingTransition: true, ...quiet } })
    const accepted = await statusOf(q)
    expect(accepted.status.state).toBe('accepted')
    expect((accepted.status.replacements as unknown[]).length).toBe(1)

    const c = await quote()
    const cb = await bookingByRef(payload, c.ref)
    for (const event of ['accept', 'confirm'] as const) await applyTransition(payload, cb.id, event, { actor: event === 'accept' ? 'client' : 'admin', now: new Date() })
    expect((await statusOf(c)).status.payment).toMatchObject({ receiptHref: expect.stringMatching(/^https:\/\/wa\.me\//) })
    for (const event of ['pay', 'schedule', 'deliver'] as const) await applyTransition(payload, cb.id, event, { actor: 'admin', now: new Date() })
    const delivered = await statusOf(c, 'ar')
    expect(delivered.status).toMatchObject({ state: 'delivered', canCancel: false })
    expect((delivered.status.history as unknown[]).length).toBeGreaterThanOrEqual(5)

    const e = await quote()
    const eb = await bookingByRef(payload, e.ref)
    await payload.update({ collection: 'bookings', id: eb.id, data: { quoteValidUntil: '2020-01-01T00:00:00.000Z' } as never, overrideAccess: true, context: { bookingTransition: true, ...quiet } })
    expect((await statusOf(e)).status).toMatchObject({ state: 'expired', canAccept: false })
  })

  it('a replaced version points to the current one', async () => {
    const payload = await getTestPayload()
    const q = await quote()
    const booking = await bookingByRef(payload, q.ref)
    await payload.update({ collection: 'bookings', id: booking.id, data: { priceAdjustment: { amount: -50, reason: 'Goodwill' } } as never, user: world.admin, overrideAccess: false })
    const { view, status } = await statusOf(q)
    expect((view.replacedBy as { reference: string }).reference).not.toBe(q.ref)
    expect(status.canAccept).toBe(false)
  })

  it('QM-US2-S6 members open their own booking without the key; others get a 404', async () => {
    const payload = await getTestPayload()
    const member = await createUser(['member'])
    await signIn(payload as never, member.email)
    const q = await quote()
    const tree = await expand(await memberQuotePage.default({ params: Promise.resolve({ locale: 'en', ref: q.ref }), searchParams: Promise.resolve({}) }))
    expect(find(tree, QuotationView)).toBeTruthy()
    expect((await memberQuotePage.generateMetadata({ params: Promise.resolve({ locale: 'en', ref: q.ref }) } as never)).robots).toMatchObject({ index: false })
    const list = await bookingsPage.default({ params: Promise.resolve({ locale: 'en' }), searchParams: Promise.resolve({ error: 'booking.errors.not-allowed' }) })
    expect(find(list, NotificationList)).toBeTruthy()
    const other = await createUser(['member'])
    jar.clear()
    await signIn(payload as never, other.email)
    expect(String(await threw(() => memberQuotePage.default({ params: Promise.resolve({ locale: 'en', ref: q.ref }), searchParams: Promise.resolve({}) })))).toContain('NEXT_NOT_FOUND')
    expect((await bookingsPage.generateMetadata({ params: Promise.resolve({ locale: 'ar' }) } as never)).robots).toMatchObject({ index: false })
  })

  it('QM-US3 the creator sees their requests and their availability; others are sent away', async () => {
    const payload = await getTestPayload()
    const q = await quote()
    await applyTransition(payload, (await bookingByRef(payload, q.ref)).id, 'accept', { actor: 'client', now: new Date() })
    await payload.create({ collection: 'availability-blocks', data: { creator: world.creators.sara!.id, user: world.creators.sara!.user.id, date: addDays(dubaiToday(new Date()), 2), kind: 'blocked' }, overrideAccess: true, context: quiet })
    await signIn(payload as never, world.creators.sara!.user.email)
    const list = await bookingsPage.default({ params: Promise.resolve({ locale: 'ar' }), searchParams: Promise.resolve({}) })
    const row = find<{ view: { awaitingAnswer: boolean; clientFirstName: string } }>(list, CreatorBookingRow)!
    expect(row.props.view).toMatchObject({ awaitingAnswer: true, clientFirstName: 'Layla' })
    const availability = await availabilityPage.default({ params: Promise.resolve({ locale: 'en' }), searchParams: Promise.resolve({ error: 'availability.errors.past' }) })
    const months = find<{ months: { days: { status: string }[] }[] }>(availability, AvailabilityList)!.props.months
    expect(months.flatMap((m) => m.days).filter((d) => d.status === 'blocked')).toHaveLength(1)
    expect((await availabilityPage.generateMetadata({ params: Promise.resolve({ locale: 'en' }) } as never)).robots).toMatchObject({ index: false })
    const seeker = await createUser(['member'])
    jar.clear()
    await signIn(payload as never, seeker.email)
    expect(await threw(() => availabilityPage.default({ params: Promise.resolve({ locale: 'en' }), searchParams: Promise.resolve({}) }))).toBeInstanceOf(Redirect)
  })
})
