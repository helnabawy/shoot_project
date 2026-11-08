import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

const register = vi.fn(async () => ({
  errors: { email: 'auth.errors.emailTaken' },
  values: { email: 'a@b.co' },
}))
const login = vi.fn(async () => ({ formError: 'auth.errors.locked' }))
vi.mock('../actions', () => ({
  register: (...a: unknown[]) => register(...(a as [])),
  login: (...a: unknown[]) => login(...(a as [])),
}))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: unknown; children: React.ReactNode }) => (
    <a href={JSON.stringify(href)}>{children}</a>
  ),
}))

const personas = [
  { slug: 'photographer', label: 'Photographer' },
  { slug: 'videographer', label: 'Videographer' },
]

describe('US4 registration form', () => {
  beforeEach(() => vi.clearAllMocks())

  it('FR-060 asks only for name, email, password and account type', () => {
    renderWithLocale(<RegisterForm locale="en" personas={personas} />)
    expect(screen.getByLabelText('Full name')).toHaveAttribute('autocomplete', 'name')
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByRole('group', { name: 'I want to' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Book a professional' })).toBeChecked()
    expect(screen.getByTestId('persona-select').parentElement).toHaveClass('hidden')
  })

  it('US4-S2 shows the active personas once "offer my services" is chosen', async () => {
    renderWithLocale(<RegisterForm locale="en" personas={personas} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Offer my services' }))
    expect(screen.getByTestId('persona-select').parentElement).not.toHaveClass('hidden')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Choose your profession',
      'Photographer',
      'Videographer',
      'Both (Photographer and Videographer)',
    ])
    expect(screen.getByRole('option', { name: 'Both (Photographer and Videographer)' })).toHaveAttribute('value', 'photographer,videographer')
  })

  it('offers "All" for three active personas and no combined option for one, from CMS data only', async () => {
    const three = [...personas, { slug: 'teacher', label: 'Teacher' }]
    const { unmount } = renderWithLocale(<RegisterForm locale="en" personas={three} initialType="provider" />)
    expect(screen.getByRole('option', { name: 'All (Photographer, Videographer and Teacher)' })).toHaveAttribute('value', 'photographer,videographer,teacher')
    unmount()
    renderWithLocale(<RegisterForm locale="en" personas={personas.slice(0, 1)} initialType="provider" />)
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose your profession', 'Photographer'])
  })

  it('opens on the provider path from ?type=provider with the persona preselected', () => {
    renderWithLocale(
      <RegisterForm
        locale="en"
        personas={personas}
        initialType="provider"
        initialPersona="videographer"
      />,
    )
    expect(screen.getByRole('radio', { name: 'Offer my services' })).toBeChecked()
    expect(screen.getByLabelText('I am a')).toHaveValue('videographer')
  })

  it('hides the provider option when no persona is active', () => {
    renderWithLocale(<RegisterForm locale="en" personas={[]} />)
    expect(screen.queryByRole('radio', { name: 'Offer my services' })).toBeNull()
  })

  it('MP-US2-S2 states acceptance with links to the documents in force, and a provider also accepts the professional terms', async () => {
    const legal = {
      terms: { label: 'Terms & Conditions', href: '/terms' },
      privacy: { label: 'Privacy Policy', href: '/privacy' },
      'professional-terms': { label: 'Professional Terms', href: '/terms/professional' },
    }
    renderWithLocale(<RegisterForm locale="en" personas={personas} legal={legal} />)
    const box = screen.getByRole('checkbox', { name: /I accept the Terms and the Privacy Policy/ })
    expect(box).toBeRequired()
    expect(box).not.toBeChecked()
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toContain('/terms')
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toContain(
      '/privacy',
    )
    expect(screen.queryByRole('link', { name: 'Professional Terms' })).toBeNull()
    await userEvent.click(screen.getByRole('radio', { name: 'Offer my services' }))
    expect(screen.getByRole('checkbox', { name: /Professional Terms/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Professional Terms' }).getAttribute('href')).toContain(
      '/terms/professional',
    )
  })

  it('MP-US2-S2 says the same words without a link for a document that is not published yet', () => {
    renderWithLocale(
      <RegisterForm locale="en" personas={personas} legal={{ terms: null, privacy: null }} />,
    )
    expect(
      screen.getByRole('checkbox', { name: /I accept the Terms and the Privacy Policy/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Terms' })).toBeNull()
  })

  it('MP-US2-S2 shows the refusal beside the checkbox, linked to it', async () => {
    register.mockResolvedValueOnce({
      errors: { acceptTerms: 'auth.errors.acceptTerms' },
      values: {},
    } as never)
    renderWithLocale(<RegisterForm locale="en" personas={personas} />)
    await userEvent.click(screen.getByTestId('register-submit'))
    const message = await screen.findByText(
      'Please accept the Terms and the Privacy Policy to create an account.',
    )
    expect(screen.getByRole('checkbox', { name: /I accept/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(
      screen.getByRole('checkbox', { name: /I accept/ }).getAttribute('aria-describedby'),
    ).toBe(message.id)
  })

  it('US4-S3 shows the server error beside the field, in plain words', async () => {
    renderWithLocale(<RegisterForm locale="en" personas={personas} />)
    await userEvent.click(screen.getByTestId('register-submit'))
    expect(register).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText('This email already has an account. Log in instead.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('US4 login form', () => {
  it('carries the return destination and announces a locked account', async () => {
    renderWithLocale(<LoginForm locale="en" next="/account" />)
    const form = screen.getByTestId('login-form') as HTMLFormElement
    expect(new FormData(form).get('next')).toBe('/account')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    await userEvent.click(screen.getByTestId('login-submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Too many attempts. Try again in 15 minutes.',
    )
  })

  it('renders in Arabic', () => {
    renderWithLocale(<LoginForm locale="ar" />, { locale: 'ar' })
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument()
  })
})
