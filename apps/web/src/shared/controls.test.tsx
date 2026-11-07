import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { themeLabels } from '../../tests/fixtures/labels'
import { MobileMenu } from './components/MobileMenu'
import { LocaleSwitcher } from './i18n/LocaleSwitcher'
import { ThemeToggle } from './theme/ThemeToggle'

const setTheme = vi.fn()
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'dark', setTheme }) }))

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/ar/register',
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('next=/account'),
}))

describe('US7 theme toggle', () => {
  it('offers light, dark and system with the active one pressed', async () => {
    render(<ThemeToggle labels={themeLabels()} />)
    expect(screen.getByRole('group', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'System' }))
    expect(setTheme).toHaveBeenCalledWith('system')
  })

  it('is labelled in Arabic', () => {
    render(<ThemeToggle labels={themeLabels('ar')} />)
    expect(screen.getByRole('group', { name: 'المظهر' })).toBeInTheDocument()
  })
})

describe('US6 language switcher', () => {
  it('links to the same page in the other language, prefixed so the choice is remembered without JavaScript', async () => {
    window.location.hash = '#faq'
    render(<LocaleSwitcher target="en" label="English" ariaLabel="Read this page in English" />)
    const link = screen.getByTestId('locale-switcher')
    expect(link).toHaveAttribute('href', '/en/register?next=%2Faccount')
    expect(link).toHaveAttribute('hreflang', 'en')
    expect(link).toHaveAccessibleName('Read this page in English')
    await userEvent.click(link)
    expect(document.cookie).toContain('NEXT_LOCALE=en')
    expect(replace).toHaveBeenCalledWith('/register?next=%2Faccount#faq', { scroll: false })
  })

  it('switching to Arabic keeps the /ar prefix', async () => {
    render(<LocaleSwitcher target="ar" label="العربية" ariaLabel="Read this page in Arabic" />)
    await userEvent.click(screen.getByTestId('locale-switcher'))
    expect(replace).toHaveBeenLastCalledWith('/ar/register?next=%2Faccount#faq', { scroll: false })
  })
})

describe('US1 mobile menu', () => {
  it('toggles with aria-expanded and closes on Escape', async () => {
    const user = userEvent.setup()
    render(
      <MobileMenu openLabel="Open menu" closeLabel="Close menu">
        <a href="#faq">Questions</a>
      </MobileMenu>,
    )
    const toggle = screen.getByTestId('nav-mobile-toggle')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAccessibleName('Open menu')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Questions' })).toBeVisible()
    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })
})
