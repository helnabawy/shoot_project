import { creatorAccountV1, creatorBriefsV1, problemV1 } from '@shoot/domain/api/v1'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { z } from 'zod'
import { GET as accountRoute } from '@/app/(payload)/api/mobile/v1/me/creator/account/route'
import { GET as briefsRoute } from '@/app/(payload)/api/mobile/v1/me/creator/briefs/route'
import type { RouteHandler } from '@/shared/api/handler'
import { bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { asVisitor, jar } from './setup/next-mocks'
import { createUser, getTestPayload } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const { creatorInbox } = await import('@/modules/inbox')

/** BI: the creator brief inbox over the mobile API. */

async function tokenFor(user: { email: string }) {
  const payload = await getTestPayload()
  return (await payload.login({ collection: 'users', data: { email: user.email, password: 'password-123' } })).token as string
}

function call(handler: RouteHandler, path: string, token: string | null, opts: { method?: string; body?: unknown; params?: Record<string, string>; locale?: string } = {}) {
  return handler(
    new Request(`http://test/api/mobile/v1/${path}`, {
      method: opts.method ?? 'GET',
      headers: { 'content-type': 'application/json', 'accept-language': opts.locale ?? 'en', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
    { params: Promise.resolve(opts.params ?? {}) },
  )
}

async function ok<S extends z.ZodType>(res: Response, schema: S): Promise<z.output<S>> {
  expect(res.status, await res.clone().text()).toBe(200)
  expect(res.headers.get('cache-control')).toContain('no-store')
  return schema.parse(await res.json())
}

describe('BI-US1 the inbox in the app', () => {
  let world: BookingWorld
  let token: string
  let ref: string

  beforeAll(async () => {
    world = await bookingWorld()
    asVisitor()
    ref = (await briefFor(submitBrief as never, world, { name: 'Layla Hassan', whatsapp: '+971501234567' })).ref
    jar.clear()
    token = await tokenFor(world.creators.sara!.user as never)
  })

  it('BI-US1-S7 the app gets the same briefs and counts as the website', async () => {
    const body = await ok(await call(briefsRoute, 'me/creator/briefs', token), creatorBriefsV1)
    const web = await creatorInbox({ payload: await getTestPayload(), locale: 'en', now: new Date() }, world.creators.sara!.user.id)
    expect(body).toEqual(web)
    expect(body.open.map((i) => i.ref)).toContain(ref)
    const account = await ok(await call(accountRoute, 'me/creator/account', token), creatorAccountV1)
    expect(account.briefs).toEqual({ count: body.open.length, soonest: expect.objectContaining({ ref: body.open[0]!.ref }) })
  })

  it('BI-US1-S3 the answer carries no client contact details, and reads Arabic', async () => {
    const res = await call(briefsRoute, 'me/creator/briefs', token, { locale: 'ar' })
    const text = await res.clone().text()
    for (const word of ['Layla', '+971', 'whatsapp', 'member']) expect(text).not.toContain(word)
    const body = await ok(res, creatorBriefsV1)
    expect(body.open.find((i) => i.ref === ref)!.emirate).toBe('دبي')
  })

  it('only providers: a client gets 403, a visitor 401', async () => {
    const seeker = await createUser(['member'])
    const res = await call(briefsRoute, 'me/creator/briefs', await tokenFor(seeker as never))
    expect(res.status).toBe(403)
    expect(problemV1.parse(await res.json()).code).toBe('creators.errors.notProvider')
    expect((await call(briefsRoute, 'me/creator/briefs', null)).status).toBe(401)
  })
})
