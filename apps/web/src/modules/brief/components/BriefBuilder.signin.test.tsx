import { encodeKeptBrief, KEPT_BRIEF_COOKIE, type KeptBrief } from '@shoot/domain/brief/kept'
import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSession } from '@/shared/components/SessionNav'
import { briefBuilderFixture } from '../../../../tests/fixtures/brief-builder'
import { testBriefLabels } from '../../../../tests/fixtures/labels'
import { renderWithLocale } from '../../../../tests/setup/render'
import type { BriefState } from '../types'
import { BriefBuilder } from './BriefBuilder'

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => '/', useSearchParams: () => new URLSearchParams() }))
const submitBrief = vi.fn(async (): Promise<BriefState> => ({ status: 'idle' }))
vi.mock('../actions', () => ({ submitBrief: (...args: unknown[]) => submitBrief(...(args as [])) }))

const LOGIN = '/login?next=%2Fbrief%2Fsend&for=brief'
const sentence = () => screen.getByTestId('brief-sentence').textContent ?? ''
const topHit = () => screen.queryByTestId('brief-submit')
const pick = (user: UserEvent, name: RegExp) => user.click(screen.getByRole('radio', { name }))

/** photographer, a wedding, any date, 2 hours, Sharjah. */
async function walk(user: UserEvent) {
  await pick(user, /Photographer/)
  await pick(user, /a wedding/)
  await user.click(screen.getByRole('button', { name: /any date/ }))
  await pick(user, /2 hours/)
  await pick(user, /Sharjah/)
}

function setup({ signInRequired = true, sourcePath = '/', locale = 'en' as 'en' | 'ar' } = {}) {
  return renderWithLocale(
    <BriefBuilder
      config={briefBuilderFixture(locale)}
      whatsappHref="https://wa.me/971500000000"
      providerHref="/register?type=provider"
      sourcePath={sourcePath}
      labels={testBriefLabels(locale)}
      quickMatch
      signInRequired={signInRequired}
    />,
    { locale },
  )
}

const kept = (over: Partial<KeptBrief> = {}): KeptBrief => ({
  v: 1,
  at: new Date().toISOString(),
  path: '/',
  locale: 'en',
  sentence: 'I need a photographer for a wedding for 2 hours in Sharjah.',
  entries: [
    ['persona', 'photographer'],
    ['occasion', 'wedding'],
    ['date', ''],
    ['duration', '2h'],
    ['location', 'sharjah'],
  ],
  ...over,
})
const keep = (value: KeptBrief) => {
  document.cookie = `${KEPT_BRIEF_COOKIE}=${encodeKeptBrief(value)}; path=/`
}
const session = (user: { name: string } | null) => {
  resetSession()
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ user: user && { ...user, avatarUrl: null } }), { status: 200 })) as typeof fetch
}

describe('021 the brief builder and sign-in', () => {
  beforeEach(() => {
    submitBrief.mockReset()
    submitBrief.mockResolvedValue({ status: 'idle' })
    router.push.mockClear()
    window.open = vi.fn(() => null)
    session(null)
  })
  afterEach(() => {
    document.cookie = `${KEPT_BRIEF_COOKIE}=; path=/; max-age=0`
  })

  it('BS-US1-S1 a guest’s send goes to the sign-in screen and says so on the action', async () => {
    const user = userEvent.setup()
    submitBrief.mockResolvedValue({ status: 'signIn', loginUrl: LOGIN })
    setup()
    await walk(user)
    await user.click(topHit()!)
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(LOGIN))
    expect(topHit()).toHaveTextContent('Taking you to log in…')
  })

  it('BS-US5-S2 a guest sees, under the action, that a code comes next; WhatsApp stays open', async () => {
    const user = userEvent.setup()
    setup()
    await walk(user)
    expect(await screen.findByTestId('brief-sign-in-next')).toHaveTextContent("Next, we'll send a code to your mobile number to log you in.")
    expect(screen.getByTestId('whatsapp-secondary')).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\//))
  })

  it('BS-US5-S2 a member, or a site without the switch, never sees the line', async () => {
    const user = userEvent.setup()
    session({ name: 'Layla' })
    const { unmount } = setup()
    await walk(user)
    await act(async () => {})
    expect(screen.queryByTestId('brief-sign-in-next')).toBeNull()
    unmount()
    session(null)
    setup({ signInRequired: false })
    await walk(user)
    await act(async () => {})
    expect(screen.queryByTestId('brief-sign-in-next')).toBeNull()
  })

  it('BS-US6-S1 by default (switch off) a guest’s complete brief shows no sign-in line, only its action', async () => {
    const user = userEvent.setup()
    session(null)
    setup({ signInRequired: false })
    await walk(user)
    await act(async () => {})
    expect(topHit()).toBeVisible()
    expect(screen.queryByTestId('brief-sign-in-next')).toBeNull()
  })

  it('BS-US5-S2 in Arabic the line is the Arabic one', async () => {
    const user = userEvent.setup()
    setup({ locale: 'ar' })
    await pick(user, /^مصوّر$/)
    await pick(user, /زفاف/)
    await user.click(screen.getByRole('button', { name: /مفتوح/ }))
    await pick(user, /ساعتين/)
    await pick(user, /الشارقة/)
    expect(await screen.findByTestId('brief-sign-in-next')).toHaveTextContent('بعدها نرسل رمزاً إلى رقم هاتفك المتحرك لتسجيل دخولك.')
  })

  it('BS-US3-S1 back from sign-in, the brief shows every answer and its action', async () => {
    keep(kept())
    setup()
    await waitFor(() => expect(sentence()).toContain('I need a photographer for a wedding'))
    expect(sentence()).toContain('Sharjah')
    expect(topHit()).toBeVisible()
    expect(document.querySelector('input[name="location"]:checked')?.getAttribute('value')).toBe('sharjah')
  })

  it('BS-US3-S1 a kept brief from another page, language or creator is not restored', async () => {
    keep(kept({ path: '/hire/weddings' }))
    const { unmount } = setup()
    await act(async () => {})
    expect(sentence()).not.toContain('photographer')
    unmount()
    keep(kept({ locale: 'ar', path: '/' }))
    setup()
    await act(async () => {})
    expect(sentence()).not.toContain('photographer')
  })

  it('BS-US3-S2 a kept brief that could not be sent shows the message on its step', async () => {
    keep(kept({ entries: kept().entries.filter(([n]) => n !== 'location'), error: { errors: { location: 'brief.errors.notAnOption' } } }))
    setup()
    const emirate = await screen.findByRole('group', { name: /Emirate/ })
    expect(within(emirate).getByText('Choose one of the options.')).toBeInTheDocument()
    expect(sentence()).toContain('a wedding')
  })

  it('BS-US3-S2 a form error of a kept brief shows under the action', async () => {
    keep(kept({ error: { errors: {}, formError: 'brief.errors.tooMany' } }))
    setup()
    expect(await screen.findByRole('alert')).toHaveTextContent('several briefs already')
  })

  it('BS-US3-S4 with nothing kept the brief starts empty', async () => {
    setup()
    await act(async () => {})
    expect(sentence()).not.toContain('I need a')
    expect(topHit()).not.toBeVisible()
  })
})
