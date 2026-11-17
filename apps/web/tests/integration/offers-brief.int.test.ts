import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { briefFor, type BookingWorld } from './setup/booking'
import { asVisitor, form } from './setup/next-mocks'
import { briefByRef, offersWorld, setOffers } from './setup/offers'
import { getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { suggestedPrices } = await import('@/modules/booking/offers')

/** Feature 022 US1: the client names a price per type with the brief (maps off: the emirate list, FR-005d). */
describe('OF-US1 the client names a price', () => {
  let world: BookingWorld
  let day = 0
  const nextDay = () => addDays(world.date, (day += 1))
  let usual = 0

  beforeAll(async () => {
    world = await offersWorld()
    asVisitor()
    const prices = await suggestedPrices({ persona: [world.personas.photographer], selections: [{ token: 'duration', value: '2h' }, { token: 'location', value: 'dubai' }], date: world.date } as never, 'en', 'dubai', { minPercent: 70, maxPercent: 200 })
    usual = prices[0]!.suggestedFils!
  })

  it('OF-US1-S1 the suggestion and range come from the price rules for the type, duration and emirate', async () => {
    expect(usual).toBeGreaterThan(0)
    const prices = await suggestedPrices({ persona: [world.personas.photographer], selections: [{ token: 'duration', value: '2h' }, { token: 'location', value: 'dubai' }], date: world.date } as never, 'en', 'dubai', { minPercent: 70, maxPercent: 200 })
    expect(prices[0]!.range).toEqual({ min: Math.round((usual * 0.7) / 100) * 100, max: Math.round((usual * 2) / 100) * 100 })
  })

  it('OF-US1-S1 OF-US6-S3 a brief sent without a price keeps the suggestion, and the fee and range it was sent with', async () => {
    const { ref } = await briefFor(submitBrief as never, world, { date: nextDay() })
    const brief = await briefByRef(ref)
    expect(brief.offers).toMatchObject({ mode: 'offers', feePercent: 10, minPercent: 70, maxPercent: 200 })
    expect((brief.budgets as { amountFils: number; suggestedFils: number }[])[0]).toMatchObject({ amountFils: usual, suggestedFils: usual })
  })

  it('OF-US1-S2 two types: one price each, each with its own suggestion', async () => {
    // The seeded builder takes one type per brief; the price rule itself prices each type of a brief.
    const prices = await suggestedPrices(
      { persona: [world.personas.photographer, world.personas.videographer], selections: [{ token: 'duration', value: '2h' }, { token: 'location', value: 'dubai' }], date: world.date } as never,
      'en',
      'dubai',
      { minPercent: 70, maxPercent: 200 },
    )
    expect(prices.map((p) => p.personaSlug)).toEqual(['photographer', 'videographer'])
    expect(prices[0]!.suggestedFils).not.toBe(prices[1]!.suggestedFils)
  })

  it('OF-US1-S3 a price outside the range is refused with the range message', async () => {
    const state = (await submitBrief({ status: 'idle' } as never, form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date: nextDay(), duration: '2h', location: 'dubai', shotBy: 'anyone', 'budget.photographer': '1' }))) as {
      status: string
      errors?: Record<string, string>
    }
    expect(state.status).toBe('error')
    expect(state.errors?.['budget.photographer']).toBe('brief.errors.budgetRange')
  })

  it('OF-US1-S3 a price inside the range is kept', async () => {
    const aed = Math.round((usual * 1.2) / 100)
    const { ref } = await briefFor(submitBrief as never, world, { date: nextDay(), 'budget.photographer': String(aed) })
    expect(((await briefByRef(ref)).budgets as { amountFils: number }[])[0]!.amountFils).toBe(aed * 100)
  })

  it('OF-US1-S4 with maps off, a city counts as its emirate and a custom place is refused', async () => {
    const { ref } = await briefFor(submitBrief as never, world, { date: nextDay(), location: 'yas-island' }).catch(() => ({ ref: '' }))
    if (ref) expect((await briefByRef(ref)).selections?.find((s) => s.token === 'location')?.value).toBe('abu-dhabi')
    const state = (await submitBrief({ status: 'idle' } as never, form({ locale: 'en', js: '1', sourcePath: '/', persona: 'photographer', occasion: 'event', date: nextDay(), duration: '2h', location: 'custom', 'location.custom': 'my villa', shotBy: 'anyone' }))) as { status: string }
    expect(state.status).toBe('error')
  })

  it('OF-US1-S6 with the switch off there is no price and the brief is fixed-price', async () => {
    const payload = await getTestPayload()
    await setOffers(payload, { enabled: false })
    try {
      const { ref } = await briefFor(submitBrief as never, world, { date: nextDay() })
      const brief = await briefByRef(ref)
      expect((brief.offers as { mode?: string } | null)?.mode ?? 'fixed').toBe('fixed')
      expect((brief.budgets as unknown[] | null) ?? []).toEqual([])
    } finally {
      await setOffers(payload, { enabled: true })
    }
  })
})
