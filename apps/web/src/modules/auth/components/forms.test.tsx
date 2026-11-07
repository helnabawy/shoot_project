import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

const register = vi.fn(async () => ({ errors: { email: 'auth.errors.emailTaken' }, values: { email: 'a@b.co' } }))
const login = vi.fn(async () => ({ formError: 'auth.errors.locked' }))
vi.mock('../actions', () => ({
  register: (...a: unknown[]) => register(...(a as [])),
  login: (...a: unknown[]) => login(...(a as [])),
}))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: unknown; children: React.ReactNode }) => <a href={JSON.stringify(href)}>{children}</a>,
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
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['Choose your profession', 'Photographer', 'Videographer'])
  })

  it('opens on the provider path from ?type=provider with the persona preselected', () => {
    renderWithLocale(<RegisterForm locale="en" personas={personas} initialType="provider" initialPersona="videographer" />)
    expect(screen.getByRole('radio', { name: 'Offer my services' })).toBeChecked()
    expect(screen.getByLabelText('I am a')).toHaveValue('videographer')
  })

  it('hides the provider option when no persona is active', () => {
    renderWithLocale(<RegisterForm locale="en" personas={[]} />)
    expect(screen.queryByRole('radio', { name: 'Offer my services' })).toBeNull()
  })

  it('US4-S3 shows the server error beside the field, in plain words', async () => {
    renderWithLocale(<RegisterForm locale="en" personas={personas} />)
    await userEvent.click(screen.getByTestId('register-submit'))
    expect(register).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('This email already has an account. Log in instead.')).toBeInTheDocument()
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
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Try again in 15 minutes.')
  })

  it('renders in Arabic', () => {
    renderWithLocale(<LoginForm locale="ar" />, { locale: 'ar' })
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument()
  })
})
