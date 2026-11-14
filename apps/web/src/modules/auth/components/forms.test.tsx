import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { CodeStep } from './CodeStep'
import { PhoneStep } from './PhoneStep'

const requestCodeAction = vi.fn(async () => ({ errors: { phone: 'auth.errors.phoneInvalid' }, values: { phone: '04 123 4567' } }))
const verifyCodeAction = vi.fn(async () => ({ errors: { code: 'auth.errors.codeInvalid' }, values: {} }))
const resendCodeAction = vi.fn(async () => ({ resendAt: new Date(Date.now() + 60_000).toISOString(), channel: 'whatsapp' }))
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

const personas = [
  { slug: 'photographer', label: 'Photographer' },
  { slug: 'videographer', label: 'Videographer' },
]
const legal = {
  terms: { label: 'Terms & Conditions', href: '/terms' },
  privacy: { label: 'Privacy Policy', href: '/privacy' },
  'professional-terms': { label: 'Professional Terms', href: '/terms/professional' },
}
const later = (s: number) => new Date(Date.now() + s * 1000).toISOString()

describe('009 US5 the number step (/login, /register)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('OT-US5-S1 asks for a UAE mobile number and a channel, SMS first, with no email sign-in', () => {
    renderWithLocale(<PhoneStep locale="en" next="/account" />)
    const phone = screen.getByLabelText('Mobile number')
    expect(phone).toHaveAttribute('type', 'tel')
    expect(phone).toHaveAttribute('dir', 'ltr')
    expect(screen.getByRole('group', { name: 'Send the code by' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'SMS' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'WhatsApp' })).not.toBeChecked()
    expect(screen.queryByRole('link', { name: /email/i })).toBeNull()
    expect(screen.queryByLabelText('Password')).toBeNull()
  })

  it('shows the field error from its message key and keeps what was typed', async () => {
    renderWithLocale(<PhoneStep locale="en" />)
    await userEvent.click(screen.getByTestId('send-code'))
    expect(await screen.findByText('Enter a UAE mobile number, like 50 123 4567.')).toBeInTheDocument()
    expect(screen.getByLabelText('Mobile number')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Mobile number')).toHaveValue('04 123 4567')
  })

  it('a rate limit is a form message with its wait filled in', async () => {
    requestCodeAction.mockResolvedValueOnce({ formError: 'auth.errors.tooManyRequests', formValues: { minutes: 12 } } as never)
    renderWithLocale(<PhoneStep locale="en" />)
    await userEvent.click(screen.getByTestId('send-code'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many codes for now. Try again in 12 minutes.')
  })

  it('OT-US5-S4 Join as a creator asks for the profession and the acceptance, never a password', () => {
    renderWithLocale(<PhoneStep locale="en" mode="join" personas={personas} legal={legal} />)
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Choose your profession',
      'Photographer',
      'Videographer',
      'Both (Photographer and Videographer)',
    ])
    expect(screen.queryByLabelText('Password')).toBeNull()
    expect(screen.queryByLabelText('Email')).toBeNull()
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toContain('/login')
  })

  it('MP-US2-S2 states acceptance with links to the documents in force, the professional terms included', () => {
    renderWithLocale(<PhoneStep locale="en" mode="join" personas={personas} legal={legal} />)
    const box = screen.getByRole('checkbox', { name: /Professional Terms/ })
    expect(box).not.toBeChecked()
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toContain('/terms')
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toContain('/privacy')
    expect(screen.getByRole('link', { name: 'Professional Terms' }).getAttribute('href')).toContain('/terms/professional')
  })

  it('MP-US2-S2 says the same words without a link for a document that is not published yet', () => {
    renderWithLocale(<PhoneStep locale="en" mode="join" personas={personas} legal={{ terms: null, privacy: null, 'professional-terms': null }} />)
    expect(screen.getByRole('checkbox', { name: /I accept the Terms/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Terms' })).toBeNull()
  })

  it('MP-US2-S2 shows the refusal beside the checkbox, linked to it', async () => {
    requestCodeAction.mockResolvedValueOnce({ errors: { acceptTerms: 'auth.errors.acceptTerms' }, values: {} } as never)
    renderWithLocale(<PhoneStep locale="en" mode="join" personas={personas} />)
    await userEvent.click(screen.getByTestId('send-code'))
    const message = await screen.findByText('Please accept the Terms and the Privacy Policy to create an account.')
    const box = screen.getByRole('checkbox', { name: /I accept/ })
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box.getAttribute('aria-describedby')).toBe(message.id)
  })

  it('renders in Arabic, right to left, with the number still left to right', () => {
    renderWithLocale(<PhoneStep locale="ar" />, { locale: 'ar' })
    expect(screen.getByLabelText('رقم الهاتف المتحرك')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByRole('radio', { name: 'واتساب' })).toBeInTheDocument()
  })
})

describe('009 US5 the code step (/login/code)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('OT-US5-S1 one field with one-time-code autofill, the number it was sent to, and the countdown', () => {
    renderWithLocale(<CodeStep locale="en" phone="+971 50 123 4567" channel="sms" resendAt={later(42)} mode="login" personas={personas} />)
    const code = screen.getByLabelText('Six-digit code')
    expect(code).toHaveAttribute('autocomplete', 'one-time-code')
    expect(code).toHaveAttribute('inputmode', 'numeric')
    expect(code).toHaveAttribute('maxlength', '6')
    expect(screen.getByTestId('sent-to')).toHaveTextContent('Sent by SMS to +971 50 123 4567.')
    expect(screen.getByText(/You can ask for a new code in 0:4\d\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /WhatsApp instead/ })).toBeNull()
  })

  it('OT-US1-S11 no role question before the code is proven: Continue asks the server whether the number is new', async () => {
    renderWithLocale(<CodeStep locale="en" phone="+971 50 123 4567" channel="sms" resendAt={later(0)} mode="login" personas={personas} legal={legal} />)
    expect(screen.queryByRole('radio')).toBeNull()
    await userEvent.type(screen.getByLabelText('Six-digit code'), '482713')
    await userEvent.click(screen.getByTestId('verify-code'))
    const form = (verifyCodeAction.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.get('askRole')).toBe('1')
    expect(form.has('role')).toBe(false)
  })

  it('OT-US1-S11 a new number gets the role rows with the code kept; "I\'m a …" asks for the profession and acceptance', async () => {
    verifyCodeAction.mockResolvedValueOnce({ needsRole: true, values: { code: '482713' } } as never)
    renderWithLocale(<CodeStep locale="en" phone="+971 50 123 4567" channel="sms" resendAt={later(0)} mode="login" personas={personas} legal={legal} />)
    await userEvent.type(screen.getByLabelText('Six-digit code'), '482713')
    await userEvent.click(screen.getByTestId('verify-code'))
    expect(await screen.findByRole('radio', { name: 'I need a Photographer or Videographer' })).toBeChecked()
    expect(screen.getByLabelText('Six-digit code')).toHaveValue('482713')
    expect(screen.getByRole('radio', { name: 'I need a Photographer or Videographer' })).toBeChecked()
    expect(screen.queryByRole('checkbox')).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: "I'm a Photographer or Videographer" }))
    expect(screen.getByLabelText('I am a')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /Professional Terms/ })).toBeInTheDocument()
  })

  it('no role rows when joining or adding a number', () => {
    renderWithLocale(<CodeStep locale="en" phone="+971 50 123 4567" channel="whatsapp" resendAt={later(0)} mode="join" personas={personas} />)
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByTestId('sent-to')).toHaveTextContent('Sent by WhatsApp')
  })

  it('a wrong code is shown on the field; after the countdown a new code can go by the other channel', async () => {
    renderWithLocale(<CodeStep locale="en" phone="+971 50 123 4567" channel="sms" resendAt={later(0)} mode="login" />)
    await userEvent.type(screen.getByLabelText('Six-digit code'), '000000')
    await userEvent.click(screen.getByTestId('verify-code'))
    expect(await screen.findByText("That code isn't right. Check the text we sent and type it again.")).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Send it by WhatsApp instead' }))
    expect(resendCodeAction).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('A new code is on its way by WhatsApp.')).toBeInTheDocument()
  })

  it('renders in Arabic', () => {
    renderWithLocale(<CodeStep locale="ar" phone="+971 50 123 4567" channel="sms" resendAt={later(10)} mode="login" personas={personas} />, { locale: 'ar' })
    expect(screen.getByLabelText('الرمز المكوّن من ستة أرقام')).toHaveAttribute('dir', 'ltr')
  })
})

describe('logical CSS only in the 009 web forms', () => {
  it.each(['PhoneStep.tsx', 'CodeStep.tsx', 'ChannelChoice.tsx', 'LegalCheck.tsx'])('%s uses no left/right utilities', (file) => {
    const source = readFileSync(join(import.meta.dirname, file), 'utf8')
    expect(source).not.toMatch(/\b(?:ml|mr|pl|pr|left|right|text-left|text-right|border-l|border-r|rounded-l|rounded-r)-/)
  })
})
