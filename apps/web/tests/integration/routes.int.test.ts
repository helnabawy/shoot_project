import { NextRequest } from 'next/server'
import type { ReactElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { seed } from '@/shared/payload/seed/seed'
import { createUser, getTestPayload, quiet, resetDatabase } from './setup/payload'

/**
 * The Next.js route handlers, pages and layout called directly against the test database.
 * Only Next's request APIs are stubbed: cookies/headers/draft mode, redirect() and notFound().
 */
const jar = new Map<string, string>()
const draft = { isEnabled: false, enable: vi.fn(), disable: vi.fn() }
const landingOverride: { fn?: (doc: Record<string, unknown>) => Record<string, unknown> } = {}

class Redirect extends Error {
  constructor(public target: unknown) {
    super('NEXT_REDIRECT')
  }
}
class NotFound extends Error {}

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
  draftMode: async () => draft,
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Redirect(url)
  },
  notFound: () => {
    throw new NotFound()
  },
}))
vi.mock('@/i18n/navigation', () => ({
  redirect: (arg: unknown) => {
    throw new Redirect(arg)
  },
}))
vi.mock('next-intl/server', () => import('../setup/server-intl'))
vi.mock('@/modules/landing/queries', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/modules/landing/queries')>()
  return {
    ...real,
    getLandingPage: async (args: Parameters<typeof real.getLandingPage>[0]) => {
      const doc = await real.getLandingPage(args)
      return (landingOverride.fn ? landingOverride.fn(doc as never) : doc) as typeof doc
    },
  }
})

const health = await import('@/app/(payload)/api/health/route')
const cron = await import('@/app/(payload)/api/cron/cleanup/route')
const preview = await import('@/app/next/preview/route')
const exitPreview = await import('@/app/next/exit-preview/route')
const home = await import('@/app/(site)/[locale]/page')
const layout = await import('@/app/(site)/[locale]/layout')
const login = await import('@/app/(site)/[locale]/login/page')
const register = await import('@/app/(site)/[locale]/register/page')
const account = await import('@/app/(site)/[locale]/account/page')
const notFoundPage = await import('@/app/(site)/[locale]/not-found')

const params = (locale: string) => ({ params: Promise.resolve({ locale }) })
const search = (values: Record<string, string> = {}) => ({ searchParams: Promise.resolve(values) })

async function settle(run: () => unknown) {
  try {
    return { value: await run(), error: null as unknown }
  } catch (error) {
    return { value: null, error }
  }
}

async function signIn(roles: ('admin' | 'editor' | 'member')[] = ['member'], extra: Record<string, unknown> = {}) {
  const user = await createUser(roles, extra)
  const payload = await getTestPayload()
  const { token } = await payload.login({ collection: 'users', data: { email: user.email!, password: 'password-123' } })
  jar.set('payload-token', token!)
  return user
}

/** Walks a returned element tree (without rendering it) and collects every element. */
function elements(node: unknown, out: ReactElement[] = []): ReactElement[] {
  if (Array.isArray(node)) node.forEach((child) => elements(child, out))
  else if (node && typeof node === 'object' && 'props' in node) {
    out.push(node as ReactElement)
    elements((node as ReactElement<{ children?: unknown }>).props.children, out)
  }
  return out
}

describe('Next.js routes and pages', () => {
  beforeEach(async () => {
    jar.clear()
    draft.isEnabled = false
    draft.enable.mockClear()
    draft.disable.mockClear()
    landingOverride.fn = undefined
    await resetDatabase()
    await seed(await getTestPayload(), { log: () => {} })
  })
  afterEach(() => vi.restoreAllMocks())

  describe('route handlers', () => {
    it('SC-009 /api/health answers ok while the database is up and 503 when it is not', async () => {
      expect(await (await health.GET()).json()).toEqual({ status: 'ok', db: 'ok' })
      const payload = await getTestPayload()
      const db = payload.db as unknown as { drizzle: { execute: () => Promise<unknown> } }
      vi.spyOn(db.drizzle, 'execute').mockRejectedValueOnce(new Error('down'))
      const down = await health.GET()
      expect(down.status).toBe(503)
      expect(await down.json()).toEqual({ status: 'error', db: 'unreachable' })
    })

    it('cron cleanup needs the bearer secret and deletes only expired rate-limit windows', async () => {
      const call = (auth?: string) => cron.GET(new Request('http://test/api/cron/cleanup', { headers: auth ? { authorization: auth } : {} }))
      expect((await call()).status).toBe(401)
      expect((await call('Bearer wrong')).status).toBe(401)
      const payload = await getTestPayload()
      const old = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      await payload.create({ collection: 'rate-limits', data: { key: 'old', count: 3, windowStart: old }, context: quiet })
      await payload.create({ collection: 'rate-limits', data: { key: 'fresh', count: 1, windowStart: new Date().toISOString() }, context: quiet })
      const response = await call(`Bearer ${process.env.CRON_SECRET}`)
      expect(await response.json()).toEqual({ deleted: 1, orphanedUploads: 0, expiredChallenges: 0 })
      const left = await payload.find({ collection: 'rate-limits' })
      expect(left.docs.map((d) => d.key)).toEqual(['fresh'])
    })

    it('FR-034 cron cleanup deletes sign-in codes that expired more than 24 hours ago (009)', async () => {
      const payload = await getTestPayload()
      const at = (ms: number) => new Date(Date.now() + ms).toISOString()
      const challenge = (publicId: string, expiresAt: string) => ({ publicId, phoneHash: 'p'.repeat(64), codeHash: 'c'.repeat(64), channel: 'sms', locale: 'en', attempts: 0, expiresAt, resendAt: expiresAt })
      await payload.create({ collection: 'otp-challenges', data: challenge('old', at(-25 * 60 * 60 * 1000)) as never, overrideAccess: true })
      await payload.create({ collection: 'otp-challenges', data: challenge('recent', at(-60 * 60 * 1000)) as never, overrideAccess: true })
      const response = await cron.GET(new Request('http://test/api/cron/cleanup', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }))
      expect(((await response.json()) as { expiredChallenges: number }).expiredChallenges).toBe(1)
      const left = await payload.find({ collection: 'otp-challenges', overrideAccess: true })
      expect(left.docs.map((d) => d.publicId)).toEqual(['recent'])
    })

    it('cron cleanup refuses every call when no secret is configured', async () => {
      vi.stubEnv('CRON_SECRET', '')
      expect((await cron.GET(new Request('http://test', { headers: { authorization: 'Bearer ' } }))).status).toBe(401)
      vi.unstubAllEnvs()
    })

    describe('FR-013 draft preview', () => {
      const open = (query: string) => preview.GET(new NextRequest(`http://test/next/preview?${query}`))

      it('refuses a wrong or missing secret', async () => {
        expect((await open('secret=nope')).status).toBe(401)
        expect((await open('')).status).toBe(401)
      })

      it('refuses anyone who is not an editor', async () => {
        expect((await open(`secret=${process.env.PREVIEW_SECRET}`)).status).toBe(403)
        await signIn(['member'])
        expect((await open(`secret=${process.env.PREVIEW_SECRET}`)).status).toBe(403)
      })

      it('turns draft mode on for an editor and stays on this site', async () => {
        await signIn(['editor'])
        const inside = await settle(() => open(`secret=${process.env.PREVIEW_SECRET}&path=/ar`))
        expect((inside.error as Redirect).target).toBe('/ar')
        expect(draft.enable).toHaveBeenCalledOnce()
        const offsite = await settle(() => open(`secret=${process.env.PREVIEW_SECRET}&path=//evil.test`))
        expect((offsite.error as Redirect).target).toBe('/')
        const none = await settle(() => open(`secret=${process.env.PREVIEW_SECRET}`))
        expect((none.error as Redirect).target).toBe('/')
      })

      it('exit-preview turns draft mode off and returns home', async () => {
        const exit = await settle(() => exitPreview.GET())
        expect((exit.error as Redirect).target).toBe('/')
        expect(draft.disable).toHaveBeenCalledOnce()
      })
    })
  })

  describe('landing page', () => {
    it('US1-S1 renders the hero and sections with FAQ structured data in the page language', async () => {
      for (const locale of ['en', 'ar'] as const) {
        const tree = elements(await home.default(params(locale)))
        const hero = tree.find((el) => 'hero' in (el.props as object)) as ReactElement<{ locale: string; hero: { headline: string } }>
        expect(hero.props.locale).toBe(locale)
        expect(hero.props.hero.headline).toBe(locale === 'ar' ? 'أنت تحدّد. نحن نصوّر.' : 'You brief. We shoot.')
        const ld = tree.find((el) => (el.props as { type?: string }).type === 'application/ld+json') as ReactElement<{
          dangerouslySetInnerHTML: { __html: string }
        }>
        const data = JSON.parse(ld.props.dangerouslySetInnerHTML.__html)
        expect(data[0]['@type']).toBe('Organization')
        expect(data[1]).toMatchObject({ '@type': 'FAQPage', inLanguage: locale })
        expect(data[1].mainEntity[0].acceptedAnswer.text.length).toBeGreaterThan(0)
      }
    })

    it('leaves out FAQ structured data when the page has no FAQ', async () => {
      landingOverride.fn = (doc) => ({ ...doc, sections: [] })
      const tree = elements(await home.default(params('en')))
      const ld = tree.find((el) => (el.props as { type?: string }).type === 'application/ld+json') as ReactElement<{
        dangerouslySetInnerHTML: { __html: string }
      }>
      expect(JSON.parse(ld.props.dangerouslySetInnerHTML.__html)).toHaveLength(1)
    })

    it('reads drafts while an editor previews (FR-013)', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'landing-page', locale: 'en', draft: true, data: { hero: { headline: 'Draft headline' } }, context: quiet })
      draft.isEnabled = true
      const tree = elements(await home.default(params('en')))
      const hero = tree.find((el) => 'hero' in (el.props as object)) as ReactElement<{ hero: { headline: string } }>
      expect(hero.props.hero.headline).toBe('Draft headline')
    })

    it('FR-040 metadata comes from the SEO tab, with hreflang alternates and a localised Open Graph locale', async () => {
      const en = await home.generateMetadata(params('en'))
      expect(en.title).toEqual({ absolute: expect.any(String) })
      expect(en.openGraph).toMatchObject({ locale: 'en_AE', type: 'website', images: undefined })
      expect(en.alternates?.languages).toMatchObject({ en: expect.any(String), ar: expect.any(String) })
      const ar = await home.generateMetadata(params('ar'))
      expect(ar.openGraph).toMatchObject({ locale: 'ar_AE' })
    })

    it('falls back to the headline for the title and passes an Open Graph image through', async () => {
      landingOverride.fn = (doc) => ({
        ...doc,
        seo: { title: '', description: null, ogImage: { id: 1, url: '/og.png', width: 1200, height: 630, alt: 'Shoot' } },
      })
      const meta = await home.generateMetadata(params('en'))
      expect(meta.title).toEqual({ absolute: (doc_headline()) })
      expect(meta.description).toBeUndefined()
      expect(meta.openGraph).toMatchObject({ images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Shoot' }] })
      landingOverride.fn = (doc) => ({ ...doc, hero: {}, seo: { ogImage: { id: 1, url: null } } })
      const bare = await home.generateMetadata(params('en'))
      expect(bare.title).toEqual({ absolute: '' })
      expect(bare.openGraph).toMatchObject({ images: undefined })
    })
  })

  describe('site layout', () => {
    it('US6-S1 sets lang and dir per locale and shows the preview bar only in draft mode', async () => {
      const en = (await layout.default({ children: null, ...params('en') })) as ReactElement<{ lang: string; dir: string }>
      expect(en.props).toMatchObject({ lang: 'en', dir: 'ltr' })
      expect(elements(en).some((el) => (el.type as { name?: string }).name === 'ExitPreviewBar')).toBe(false)
      draft.isEnabled = true
      const ar = (await layout.default({ children: null, ...params('ar') })) as ReactElement<{ lang: string; dir: string }>
      expect(ar.props).toMatchObject({ lang: 'ar', dir: 'rtl' })
      expect(elements(ar).some((el) => (el.type as { name?: string }).name === 'ExitPreviewBar')).toBe(true)
    })

    it('answers 404 for a locale the site does not have', async () => {
      const result = await settle(() => layout.default({ children: null, ...params('fr') }))
      expect(result.error).toBeInstanceOf(NotFound)
    })

    it('handles missing navigation and social links', async () => {
      landingOverride.fn = (doc) => ({ ...doc, navigation: null })
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'site-settings', data: { social: [] }, context: quiet })
      const tree = elements(await layout.default({ children: null, ...params('en') }))
      const header = tree.find((el) => (el.type as { name?: string }).name === 'Header') as ReactElement<{ navigation: unknown[] }>
      expect(header.props.navigation).toEqual([])
    })

    it('pre-renders both locales unless the build has no database', async () => {
      expect(layout.generateStaticParams()).toEqual([{ locale: 'en' }, { locale: 'ar' }])
      vi.stubEnv('SKIP_BUILD_STATIC_GENERATION', 'true')
      expect(layout.generateStaticParams()).toEqual([])
      vi.unstubAllEnvs()
    })

    it('metadata carries the site name template in each language', async () => {
      const meta = await layout.generateMetadata(params('ar'))
      expect(meta.title).toMatchObject({ template: expect.stringContaining('%s') })
      expect(meta.metadataBase).toBeInstanceOf(URL)
    })

    it('MP-US5-S1 the 404 page is the designed not-found view in the page language, "can\'t find" unless the address was removed', async () => {
      const view = (await notFoundPage.default()) as ReactElement<{ variant: string; locale: string }>
      expect(view.props).toMatchObject({ variant: 'notFound', locale: 'en' })
    })
  })

  describe('US4 auth pages', () => {
    it('OT-US5-S1 login renders the number step for a visitor and passes only a safe next path', async () => {
      const tree = elements(await login.default({ ...params('ar'), ...search({ next: 'https://evil.test' }) }))
      const form = tree.find((el) => (el.type as { name?: string }).name === 'PhoneStep') as ReactElement<{ next: string; locale: string; mode: string }>
      expect(form.props).toMatchObject({ next: '/account', locale: 'ar', mode: 'login' })
      expect((await login.generateMetadata({ ...params('en'), ...search() })).robots).toEqual({ index: false })
    })

    it('login and register send a signed-in member on to their destination', async () => {
      await signIn()
      const fromLogin = await settle(() => login.default({ ...params('en'), ...search({ next: '/account' }) }))
      expect((fromLogin.error as Redirect).target).toEqual({ href: '/account', locale: 'en' })
      const fromRegister = await settle(() => register.default({ ...params('ar'), ...search() }))
      expect((fromRegister.error as Redirect).target).toEqual({ href: '/account', locale: 'ar' })
    })

    it('OT-US5-S4 register is Join as a creator by code, with the active professions and ?persona=', async () => {
      const tree = elements(await register.default({ ...params('en'), ...search({ type: 'provider', persona: 'videographer' }) }))
      const form = tree.find((el) => (el.type as { name?: string }).name === 'PhoneStep') as ReactElement<{ personas: { slug: string }[]; mode: string; initialPersona?: string }>
      expect(form.props.personas.map((p) => p.slug)).toEqual(['photographer', 'videographer'])
      expect(form.props).toMatchObject({ mode: 'join', initialPersona: 'videographer' })
      expect((await register.generateMetadata({ ...params('ar'), ...search() })).title).toBeTruthy()
    })

    it('FR-025 the account page sends a visitor to log in', async () => {
      const result = await settle(() => account.default(params('en')))
      expect((result.error as Redirect).target).toEqual({ href: { pathname: '/login', query: { next: '/account' } }, locale: 'en' })
      expect((await account.generateMetadata(params('en'))).robots).toEqual({ index: false })
    })

    it('US4-S1 the account page shows the member, their profession and their briefs', async () => {
      const payload = await getTestPayload()
      const { docs } = await payload.find({ collection: 'personas', where: { slug: { equals: 'videographer' } } })
      await signIn(['member'], { accountType: 'provider', persona: [docs[0]!.id] })
      const tree = elements(await account.default(params('en')))
      const summary = tree.find((el) => (el.type as { name?: string }).name === 'AccountSummary') as ReactElement<{ personaLabel?: string }>
      expect(summary.props.personaLabel).toBe('Videographer')
      const briefs = tree.find((el) => (el.type as { name?: string }).name === 'MyBriefs') as ReactElement<{ briefs: unknown[] }>
      expect(briefs.props.briefs).toEqual([])
    })

    it('a seeker has no profession row', async () => {
      await signIn()
      const tree = elements(await account.default(params('ar')))
      const summary = tree.find((el) => (el.type as { name?: string }).name === 'AccountSummary') as ReactElement<{ personaLabel?: string }>
      expect(summary.props.personaLabel).toBeUndefined()
    })
  })
})

/** The seeded English headline, used as the title fallback. */
function doc_headline() {
  return 'You brief. We shoot.'
}
