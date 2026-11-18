import { noticesV1, problemV1 } from '@shoot/domain/api/v1'
import type { ReactElement } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { GET as noticesRoute } from '@/app/(payload)/api/mobile/v1/me/notifications/route'
import { POST as readRoute } from '@/app/(payload)/api/mobile/v1/me/notifications/[id]/read/route'
import type { RouteHandler } from '@/shared/api/handler'
import { bookingWorld, briefFor, type BookingWorld } from './setup/booking'
import { asVisitor, jar, signIn } from './setup/next-mocks'
import { createUser, getTestPayload, quiet } from './setup/payload'

vi.mock('next/headers', async () => (await import('./setup/next-mocks')).nextHeaders)
vi.mock('next/navigation', async () => (await import('./setup/next-mocks')).nextNavigation)
vi.mock('next-intl/server', async () => await import('../setup/server-intl'))
vi.mock('@/i18n/navigation', async () => (await import('./setup/next-mocks')).i18nNavigation)

const { submitBrief } = await import('@/modules/brief/actions')
const notificationsPage = await import('@/app/(site)/[locale]/account/notifications/page')
const { NotificationList } = await import('@/modules/booking/components/NotificationList')
const { noticePath } = await import('@/modules/booking/notices')

/** NT: the member's own notices over the mobile API and on `/account/notifications`. */

type Who = { email: string }
async function tokenFor(user: Who) {
  const payload = await getTestPayload()
  return (await payload.login({ collection: 'users', data: { email: user.email, password: 'password-123' } })).token as string
}

function call(handler: RouteHandler, path: string, token: string | null, params: Record<string, string> = {}, method = 'GET') {
  return handler(new Request(`http://test/api/mobile/v1/${path}`, { method, headers: token ? { authorization: `Bearer ${token}` } : {} }), { params: Promise.resolve(params) })
}

function elements(node: unknown, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((child) => elements(child, out))
  else if (node && typeof node === 'object' && 'props' in node) {
    out.push(node as ReactElement)
    elements((node as ReactElement<Record<string, unknown>>).props.children, out)
  }
  return out
}

describe('NT notifications', () => {
  let world: BookingWorld
  let member: Awaited<ReturnType<typeof createUser>>
  let token: string
  const ids: Record<string, string> = {}

  beforeAll(async () => {
    world = await bookingWorld()
    const payload = await getTestPayload()
    asVisitor()
    const b = await briefFor(submitBrief as never, world)
    const brief = (await payload.find({ collection: 'briefs', where: { reference: { equals: b.ref } }, limit: 1, depth: 0, overrideAccess: true })).docs[0]!
    member = await createUser(['member'])
    const other = await createUser(['member'])
    token = await tokenFor(member as Who)
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    let n = 0
    const row = async (name: string, data: Record<string, unknown>) => {
      n += 1
      const doc = await payload.create({
        collection: 'notifications',
        data: { brief: brief.id, event: 'brief-accepted', audience: 'client', channel: 'in-app', locale: 'en', user: member.id, text: `Notice ${name}`, link: '', dedupeKey: `nt-${name}-${Date.now()}-${n}`, ...data } as never,
        overrideAccess: true,
        context: quiet,
      })
      ids[name] = String(doc.id)
      // Distinct creation times keep the newest-first order certain.
      await new Promise((r) => setTimeout(r, 5))
    }
    await row('old', { event: 'offer-new', link: `${site}/ar/match/${b.ref}/${b.key}`, readAt: new Date().toISOString() })
    await row('creator', { event: 'brief-new', audience: 'creator', link: '/account/inbox' })
    await row('client', { link: `${site}/match/${b.ref}/${b.key}` })
    await row('admin', { audience: 'admin', link: `${site}/admin/collections/briefs/${brief.id}` })
    await row('whatsapp', { channel: 'whatsapp', link: 'https://wa.me/971500000000' })
    await row('others', { user: other.id })
  })

  it('NT-US1-S1 lists the member’s own in-app notices, newest first, read and unread, never admin, WhatsApp or another person’s', async () => {
    const res = await call(noticesRoute, 'me/notifications', token)
    expect(res.status, await res.clone().text()).toBe(200)
    expect(res.headers.get('cache-control')).toContain('no-store')
    const list = noticesV1.parse(await res.json())
    expect(list.items.map((n) => n.id)).toEqual([ids.client, ids.creator, ids.old])
    expect(list.unread).toBe(2)
    expect(list.items[0]).toMatchObject({ event: 'brief-accepted', audience: 'client', read: false })
    expect(list.items[0]!.ref).toMatch(/\S/)
    expect(list.items[0]!.path).toMatch(/^\/match\//)
    // The Arabic prefix and the origin are dropped; the app adds its own language.
    expect(list.items[2]!.path).toMatch(/^\/match\//)
    expect(list.items[1]).toMatchObject({ audience: 'creator', path: '/account/inbox' })
  })

  it('NT-US1-S2 marking a notice read answers the updated list; another person’s notice is not found', async () => {
    const res = await call(readRoute, `me/notifications/${ids.client}/read`, token, { id: ids.client! }, 'POST')
    expect(res.status, await res.clone().text()).toBe(200)
    const list = noticesV1.parse(await res.json())
    expect(list.items.find((n) => n.id === ids.client)?.read).toBe(true)
    expect(list.unread).toBe(1)
    for (const id of [ids.others!, ids.admin!]) {
      const refused = await call(readRoute, `me/notifications/${id}/read`, token, { id }, 'POST')
      expect(refused.status).toBe(404)
      expect(problemV1.parse(await refused.json()).code).toBe('booking.errors.not-found')
    }
  })

  it('NT-US1-S4 a signed-out caller is refused', async () => {
    const res = await call(noticesRoute, 'me/notifications', null)
    expect(res.status).toBe(401)
  })

  it('NT-US1-S1 a notice leads to a site path only', () => {
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    expect(noticePath(`${site}/ar/q/Q-1/k`)).toBe('/q/Q-1/k')
    expect(noticePath(`${site}/ar`)).toBe('/')
    expect(noticePath('/account/bookings')).toBe('/account/bookings')
    expect(noticePath(`${site}/admin/collections/briefs/1`)).toBeNull()
    expect(noticePath('https://wa.me/971500000000')).toBeNull()
    expect(noticePath('//evil.example/x')).toBeNull()
    expect(noticePath('')).toBeNull()
    expect(noticePath('not a url')).toBeNull()
  })

  it('NT-US2-S2 the website page lists the same notices with their stored text', async () => {
    const payload = await getTestPayload()
    jar.clear()
    await signIn(payload as never, member.email!)
    const tree = await notificationsPage.default({ params: Promise.resolve({ locale: 'en' }) })
    const list = elements(tree).find((e) => e.type === NotificationList) as ReactElement<{ items: { id: string; text: string; read: boolean }[] }> | undefined
    expect(list?.props.items.map((n) => n.text)).toEqual(['Notice client', 'Notice creator', 'Notice old'])
    expect((await notificationsPage.generateMetadata({ params: Promise.resolve({ locale: 'en' }) } as never)).robots).toMatchObject({ index: false })
  })
})
