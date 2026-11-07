import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Brief, Media, User } from '@/payload-types'

vi.mock('server-only', () => ({}))
vi.mock('next-intl/server', () => import('../../../tests/setup/server-intl'))
vi.mock('@/modules/auth/actions', () => ({ logout: vi.fn() }))

const { Header } = await import('./Header')
const { Footer } = await import('./Footer')
const { CmsImage } = await import('./CmsImage')
const { MyBriefs } = await import('@/modules/brief/components/MyBriefs')
const { AccountSummary } = await import('@/modules/auth/components/AccountSummary')

const media = (over: Partial<Media> = {}): Media =>
  ({ id: 1, alt: 'Logo', url: '/api/media/file/logo.png', width: 400, height: 100, updatedAt: '', createdAt: '', ...over }) as Media

describe('Header', () => {
  it('US1-S2 renders section links and the login entry, localised for Arabic', async () => {
    render(await Header({ siteName: 'Shoot Project', navigation: [{ label: 'كيف يعمل', target: '#how-it-works' }, { label: 'حساب', target: '/account' }], locale: 'ar' }))
    const nav = screen.getAllByRole('navigation', { name: 'الرئيسية' })[0]!
    expect(within(nav).getByRole('link', { name: 'كيف يعمل' })).toHaveAttribute('href', '#how-it-works')
    expect(within(nav).getByRole('link', { name: 'حساب' })).toHaveAttribute('href', '/ar/account')
    expect(screen.getByRole('link', { name: 'Shoot Project' })).toHaveAttribute('href', '/ar')
  })

  it('MP-US1-S4 lists page links after the section links, in the visitor’s language', async () => {
    render(
      await Header({
        siteName: 'S',
        navigation: [{ label: 'How it works', target: '#how-it-works' }, { label: 'Studios', target: '/studios' }],
        locale: 'ar',
      }),
    )
    const nav = screen.getAllByRole('navigation', { name: 'الرئيسية' })[0]!
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['#how-it-works', '/ar/studios'])
  })

  it('shows the account link to a signed-in member and the CMS logo when set', async () => {
    render(await Header({ siteName: 'Shoot Project', logo: media(), navigation: [], accountHref: '/account', locale: 'en' }))
    expect(screen.getAllByRole('link', { name: /account/i })[0]).toHaveAttribute('href', '/account')
    expect(screen.getByAltText('Logo')).toBeInTheDocument()
  })
})

describe('Footer', () => {
  it('US6-S7 keeps email and phone left-to-right and lists social links', async () => {
    render(
      await Footer({
        siteName: 'Shoot Project',
        social: [{ platform: 'instagram', url: 'https://instagram.com/x' }],
        contactEmail: 'hello@example.test',
        phoneNumber: '+971500000000',
        locale: 'ar',
      }),
    )
    expect(screen.getByText('+971500000000').closest('bdi')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByRole('link', { name: 'hello@example.test' })).toHaveAttribute('href', 'mailto:hello@example.test')
    expect(screen.getByRole('link', { name: 'instagram' })).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('MP-US1-S4 lists the editor’s footer groups and the legal links in the visitor’s language', async () => {
    render(
      await Footer({
        siteName: 'S',
        social: [],
        locale: 'ar',
        groups: [{ key: 'company', label: 'الشركة', links: [{ label: 'الاستوديوهات', href: '/studios' }] }],
        legal: [{ label: 'الشروط', href: '/terms' }, { label: 'الخصوصية', href: '/privacy' }],
      }),
    )
    const group = screen.getByRole('navigation', { name: 'الشركة' })
    expect(within(group).getByRole('link', { name: 'الاستوديوهات' })).toHaveAttribute('href', '/ar/studios')
    const legal = screen.getByRole('navigation', { name: 'قانوني' })
    expect(within(legal).getByRole('link', { name: 'الشروط' })).toHaveAttribute('href', '/ar/terms')
    expect(within(legal).getByRole('link', { name: 'الخصوصية' })).toHaveAttribute('href', '/ar/privacy')
  })

  it('MP-US1-S4 renders no group or legal navigation when there is nothing to show', async () => {
    render(await Footer({ siteName: 'S', social: [], locale: 'en', groups: [], legal: [] }))
    expect(screen.queryByTestId('footer-groups')).toBeNull()
    expect(screen.queryByTestId('footer-legal')).toBeNull()
  })

  it('leaves the language and theme controls to the header and names the site once, in the copyright', async () => {
    render(await Footer({ siteName: 'Shoot Project', social: [], locale: 'en', legal: [{ label: 'Privacy', href: '/privacy' }] }))
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).queryByTestId('theme-toggle')).toBeNull()
    expect(within(footer).queryByTestId('locale-switcher')).toBeNull()
    expect(within(footer).getAllByText(/Shoot Project/)).toHaveLength(1)
    expect(within(footer).getByText(/© \d{4} Shoot Project\./)).toBeInTheDocument()
  })

  it('groups the contact details under a labelled column', async () => {
    render(await Footer({ siteName: 'S', social: [], locale: 'en', contactEmail: 'hello@example.test' }))
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'hello@example.test' })).toHaveAttribute('href', 'mailto:hello@example.test')
  })

  it('omits contact details that are not set', async () => {
    render(await Footer({ siteName: 'S', social: [], locale: 'en' }))
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(document.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull()
  })
})

describe('CmsImage', () => {
  it('uses the size variant when it exists and the original otherwise', () => {
    const { rerender } = render(<CmsImage media={media({ sizes: { card: { url: '/card.webp', width: 800, height: 200 } } })} />)
    expect(screen.getByAltText('Logo').getAttribute('src')).toContain('card.webp')
    rerender(<CmsImage media={media()} size="hero" />)
    expect(screen.getByAltText('Logo').getAttribute('src')).toContain('logo.png')
  })

  it('FR-043 renders a dark variant hidden in light theme', () => {
    render(<CmsImage media={media()} dark={media({ id: 2, alt: 'Logo dark', url: '/dark.png' })} />)
    expect(screen.getByAltText('Logo')).toHaveClass('dark:hidden')
    expect(screen.getByAltText('Logo dark')).toHaveClass('hidden', 'dark:block')
  })

  it('renders nothing for an unpopulated relation or an image without dimensions', () => {
    const { container, rerender } = render(<CmsImage media={3} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<CmsImage media={media({ width: null })} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('MyBriefs', () => {
  it('US8-S8 lists each brief with its reference and status', async () => {
    const briefs = [{ id: 1, sentence: 'I need a photographer.', reference: 'B-ABCDE', status: 'new' }] as Brief[]
    render(await MyBriefs({ briefs, locale: 'en' }))
    expect(screen.getByText('I need a photographer.')).toBeInTheDocument()
    expect(screen.getByText('B-ABCDE').closest('bdi')).toBeTruthy()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/#brief')
  })

  it('shows the empty state in Arabic', async () => {
    render(await MyBriefs({ briefs: [], locale: 'ar' }))
    expect(screen.getByTestId('my-briefs')).toHaveTextContent(/\p{Script=Arabic}/u)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ar#brief')
  })
})

describe('AccountSummary', () => {
  it('US4-S1 shows the member details, profession and a logout button', async () => {
    const user = { id: 1, name: 'mona', email: 'mona@example.test', accountType: 'provider' } as User
    render(await AccountSummary({ user, personaLabel: 'Photographer', locale: 'en' }))
    expect(screen.getByText('mona@example.test')).toBeInTheDocument()
    expect(screen.getByText('Photographer')).toBeInTheDocument()
    expect(screen.getByTestId('logout')).toHaveAttribute('type', 'submit')
  })
})
