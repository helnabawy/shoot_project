import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { CodeStep } from './CodeStep'
import { KeptBrief } from './KeptBrief'
import { PhoneStep } from './PhoneStep'

const requestCodeAction = vi.fn(async () => undefined)
const verifyCodeAction = vi.fn(async () => ({ needsRole: true, values: { code: '482713' } }))
const resendCodeAction = vi.fn(async () => undefined)
vi.mock('../actions', () => ({
  requestCodeAction: (...a: unknown[]) => requestCodeAction(...(a as [])),
  verifyCodeAction: (...a: unknown[]) => verifyCodeAction(...(a as [])),
  resendCodeAction: (...a: unknown[]) => resendCodeAction(...(a as [])),
}))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: unknown; children: React.ReactNode }) => (
    <a href={typeof href === 'string' ? href : JSON.stringify(href)} {...rest}>
      {children}
    </a>
  ),
}))

const personas = [{ slug: 'photographer', label: 'Photographer' }]
const later = (s: number) => new Date(Date.now() + s * 1000).toISOString()
const code = (props: Partial<Parameters<typeof CodeStep>[0]> = {}) =>
  renderWithLocale(<CodeStep locale="en" phone="+971 50 123 4567" channel="sms" resendAt={later(0)} mode="login" personas={personas} {...props} />)

describe('021 sign-in from a brief', () => {
  beforeEach(() => vi.clearAllMocks())

  it('BS-US1-S1 the number step shows the kept brief with a way back, and posts the brief intent', async () => {
    renderWithLocale(
      <PhoneStep
        locale="en"
        next="/brief/send"
        intent="brief"
        lead={<KeptBrief sentence="I need a photographer for a wedding in Dubai." sentenceLocale="en" href="/hire/weddings" label="Your brief" changeLabel="Change it" />}
      />,
    )
    const kept = screen.getByTestId('kept-brief')
    expect(kept).toHaveTextContent('Your brief')
    expect(kept).toHaveTextContent('I need a photographer for a wedding in Dubai.')
    expect(screen.getByRole('link', { name: 'Change it' })).toHaveAttribute('href', '/hire/weddings')
    await userEvent.type(screen.getByLabelText('Mobile number'), '501234567')
    await userEvent.click(screen.getByTestId('send-code'))
    const form = (requestCodeAction.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.get('intent')).toBe('brief')
    expect(form.get('next')).toBe('/brief/send')
  })

  it('BS-US1-S1 an Arabic brief keeps its language and direction on an English page', () => {
    renderWithLocale(<KeptBrief sentence="أحتاج مصوّراً لزفاف في دبي." sentenceLocale="ar" href="/ar" label="Your brief" changeLabel="Change it" />)
    const text = screen.getByText('أحتاج مصوّراً لزفاف في دبي.')
    expect(text).toHaveAttribute('lang', 'ar')
    expect(text).toHaveAttribute('dir', 'auto')
  })

  it('BS-US2-S1 from a brief the code step never asks the role, and "change number" keeps the brief', async () => {
    code({ intent: 'brief' })
    await userEvent.type(screen.getByLabelText('Six-digit code'), '482713')
    await userEvent.click(screen.getByTestId('verify-code'))
    const form = (verifyCodeAction.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.has('askRole')).toBe(false)
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByRole('link', { name: 'Change number' }).getAttribute('href')).toContain('"for":"brief"')
  })

  it('BS-US2-S2 not from a brief, a new number is still asked client or creator', async () => {
    code()
    await userEvent.type(screen.getByLabelText('Six-digit code'), '482713')
    await userEvent.click(screen.getByTestId('verify-code'))
    const form = (verifyCodeAction.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.get('askRole')).toBe('1')
    expect(await screen.findAllByRole('radio')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Change number' })).toHaveAttribute('href', '/login')
  })
})

describe('021 amendment: sign-in from a quotation\'s Accept', () => {
  beforeEach(() => verifyCodeAction.mockClear())

  it('BS-US7-S3 the number step posts the accept intent and the quotation as next', async () => {
    renderWithLocale(<PhoneStep locale="en" next="/q/Q-2026-0142/k3y" intent="accept" />)
    await userEvent.type(screen.getByLabelText(/mobile number/i), '501234567')
    await userEvent.click(screen.getByTestId('send-code'))
    const form = (requestCodeAction.mock.calls.at(-1) as unknown as [unknown, FormData])[1]
    expect(form.get('intent')).toBe('accept')
    expect(form.get('next')).toBe('/q/Q-2026-0142/k3y')
  })

  it('BS-US7-S3 the code step never asks the role, and "change number" keeps the quotation', async () => {
    code({ intent: 'accept', next: '/q/Q-2026-0142/k3y' })
    await userEvent.type(screen.getByLabelText('Six-digit code'), '482713')
    await userEvent.click(screen.getByTestId('verify-code'))
    const form = (verifyCodeAction.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.has('askRole')).toBe(false)
    expect(screen.queryByRole('radio')).toBeNull()
    const href = screen.getByRole('link', { name: 'Change number' }).getAttribute('href')!
    expect(JSON.parse(href)).toEqual({ pathname: '/login', query: { next: '/q/Q-2026-0142/k3y', for: 'accept' } })
  })
})
