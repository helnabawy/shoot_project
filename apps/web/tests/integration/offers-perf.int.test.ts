import { addDays } from '@shoot/domain/booking'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { briefFor, type BookingWorld } from './setup/booking'
import { asVisitor } from './setup/next-mocks'
import { offersWorld } from './setup/offers'
import { getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { matchStamp } = await import('@/modules/booking/match')
const { inboxStamp, inboxContext } = await import('@/modules/inbox')

const p95 = (ms: number[]) => [...ms].sort((a, b) => a - b)[Math.floor(ms.length * 0.95) - 1]!

describe('OF-SC-007 the polled stamps are cheap', () => {
  let world: BookingWorld
  beforeAll(async () => {
    world = await offersWorld()
    asVisitor()
  })

  it('the step-2 stamp and the inbox stamp answer quickly (p95 over 30 reads)', async () => {
    const b = await briefFor(submitBrief as never, world, { date: addDays(world.date, 4) })
    const ctx = await inboxContext('en', new Date())
    const userId = (world.creators.sara!.user as { id: number }).id
    await matchStamp(b.ref, b.key, 'en', new Date()) // warm caches
    await inboxStamp(ctx, userId)
    const match: number[] = []
    const inbox: number[] = []
    for (let i = 0; i < 30; i++) {
      let t = performance.now()
      await matchStamp(b.ref, b.key, 'en', new Date())
      match.push(performance.now() - t)
      t = performance.now()
      await inboxStamp(ctx, userId)
      inbox.push(performance.now() - t)
    }
    console.log(`stamp p95: match ${p95(match).toFixed(0)} ms, inbox ${p95(inbox).toFixed(0)} ms`)
    await getTestPayload()
    expect(p95(inbox)).toBeLessThan(150)
    expect(p95(match)).toBeLessThan(150)
  })
})
