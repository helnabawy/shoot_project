import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { profileView } from '../../../../tests/fixtures/creators'
import { ProfileView } from './ProfileView'

const props = { displayCode: 'CR-7K4Q2', canBook: true, bookHref: '/book/7k4q2', askHref: 'https://wa.me/971500000000?text=Hi' }
const render = (over: Partial<Parameters<typeof ProfileView>[0]> = {}, locale: 'en' | 'ar' = 'en') =>
  renderWithLocale(<ProfileView view={profileView()} {...props} {...over} />, { locale })

describe('CP-US2-S1 profile', () => {
  it('shows the creator as one panel: name as the page title, the code, and every fact from the data', () => {
    render()
    expect(screen.getByRole('heading', { level: 1, name: 'Sara Khan' })).toBeInTheDocument()
    expect(within(screen.getByTestId('profile-code')).getByText('CR-7K4Q2').closest('bdi')).toHaveAttribute('dir', 'ltr')
    const header = screen.getByTestId('profile-header')
    for (const text of ['Photographer and videographer', 'Portrait · Wedding & engagement', 'Dubai Marina · Abu Dhabi', 'English · Arabic']) {
      expect(within(header).getByText(text)).toBeInTheDocument()
    }
    for (const kind of ['Professional', 'Shoots', 'Works in', 'Speaks']) expect(within(header).getByText(kind)).toBeInTheDocument()
  })

  it('CP-FR-011 shows years of experience and nationality, never gender', () => {
    render({ view: profileView({ nationality: 'United Arab Emirates', yearsExperience: 8 }) })
    const header = screen.getByTestId('profile-header')
    expect(within(header).getByText('8 years')).toBeInTheDocument()
    expect(within(header).getByText('United Arab Emirates')).toBeInTheDocument()
    expect(within(header).getByText('Experience')).toBeInTheDocument()
    expect(header.textContent).not.toMatch(/female|woman/i)
  })

  it('CP-US2-S1 keeps the Top Hit before the secondary facts, so it stays above the fold on a 360 × 640 phone', () => {
    render({ view: profileView({ nationality: 'United Arab Emirates', yearsExperience: 8 }) })
    const book = screen.getByTestId('profile-book')
    const about = screen.getByTestId('profile-about')
    // The deciding facts (verified, types, shoots, places) lead; then the booking; then the rest under "About".
    expect(book.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const text of ['English · Arabic', '8 years', 'United Arab Emirates']) expect(within(about).getByText(text)).toBeInTheDocument()
    expect(within(about).queryByText('Dubai Marina · Abu Dhabi')).toBeNull()
  })

  it('CP-FR-011 leaves out experience and nationality when not given', () => {
    render()
    expect(screen.queryByText('Experience')).toBeNull()
    expect(screen.queryByText('Nationality')).toBeNull()
  })

  it('says what "verified" means in one plain sentence, not as a badge', () => {
    render()
    const verified = screen.getByTestId('badge-verified')
    expect(verified).toHaveTextContent('Verified')
    expect(verified).toHaveTextContent('Profile checked by our team before it was listed.')
  })

  it('the one primary action books this creator by their full name', () => {
    render()
    const book = screen.getByTestId('profile-book')
    expect(book).toHaveTextContent('Book with Sara Khan')
    expect(book).toHaveAttribute('href', '/book/7k4q2')
    expect(book.className).toContain('bg-primary')
  })

  it('offers WhatsApp and the creator\'s own links as plain rows, links opened safely', () => {
    render()
    const ask = screen.getByTestId('profile-ask-whatsapp')
    expect(ask).toHaveAttribute('href', 'https://wa.me/971500000000?text=Hi')
    expect(ask).toHaveAttribute('target', '_blank')
    const social = screen.getAllByTestId('profile-social')
    expect(social.map((a) => a.getAttribute('href'))).toEqual(['https://instagram.com/sara', 'https://sara.example'])
    expect(social[0]).toHaveTextContent('Instagram')
    expect(social[1]).toHaveTextContent('Website')
    for (const a of social) expect(a.getAttribute('rel')).toBe('noopener nofollow ugc')
  })

  it('a creator who cannot be booked has no Book action: the Top Hit is WhatsApp, once', () => {
    render({ canBook: false })
    expect(screen.queryByTestId('profile-book')).toBeNull()
    const ask = screen.getAllByTestId('profile-ask-whatsapp')
    expect(ask).toHaveLength(1)
    expect(ask[0]!.className).toContain('bg-primary')
  })

  it('keeps the bio\'s line breaks and shows the work', () => {
    render()
    expect(screen.getByTestId('profile-bio')).toHaveTextContent('Weddings and portraits.')
    expect(screen.getByTestId('profile-bio').textContent).toContain('\n')
    expect(screen.getByRole('heading', { level: 2, name: 'Work' })).toBeInTheDocument()
    expect(screen.getByTestId('sample-gallery')).toBeInTheDocument()
    expect(screen.queryByTestId('profile-awaiting-samples')).toBeNull()
  })

  it('CP-US2-S1 counts the work and, from the panel, jumps to it (the row is for phones, where the work sits below)', () => {
    const view = profileView()
    render({ view })
    const count = view.samples.length
    expect(screen.getByTestId('profile-work-count')).toHaveTextContent(new RegExp(`^${count} piece`))
    const jump = within(screen.getByTestId('profile-header')).getByTestId('profile-see-work')
    expect(jump).toHaveAttribute('href', '#work')
    expect(jump.className).toContain('lg:hidden')
    expect(document.getElementById('work')).toContainElement(screen.getByTestId('sample-gallery'))
    // The booking still comes first: the jump is an action, never the Top Hit.
    expect(screen.getByTestId('profile-book').compareDocumentPosition(jump) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('without samples: an honest "hasn\'t added work yet" row, never an empty grid', () => {
    render({ view: profileView({ samples: [] }) })
    expect(screen.queryByTestId('profile-see-work')).toBeNull()
    expect(screen.queryByTestId('profile-work-count')).toBeNull()
    expect(screen.getByTestId('profile-awaiting-samples')).toHaveTextContent("Sara Khan hasn't added work yet.")
    expect(screen.queryByTestId('sample-gallery')).toBeNull()
  })

  it('leaves out what the creator did not fill in: photo (initials show), bio, links, types, places, languages', () => {
    render({ view: profileView({ photo: null, bio: '', social: [], types: '', specialties: [], places: [], languages: [] }) })
    expect(screen.getByText('SK')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByTestId('profile-bio')).toBeNull()
    expect(screen.queryByTestId('profile-social')).toBeNull()
    for (const kind of ['Professional', 'Shoots', 'Works in', 'Speaks']) expect(screen.queryByText(kind)).toBeNull()
    // The verified row and the action are always there.
    expect(screen.getByTestId('badge-verified')).toBeInTheDocument()
    expect(screen.getByTestId('profile-book')).toBeInTheDocument()
  })

  it('is fully Arabic and right to left in Arabic', () => {
    render({ view: profileView({ name: 'سارة خان', types: 'مصوّر ومصوّر فيديو' }) }, 'ar')
    expect(screen.getByRole('heading', { level: 1, name: 'سارة خان' })).toBeInTheDocument()
    expect(screen.getByTestId('profile-book')).toHaveTextContent('احجز مع سارة خان')
    expect(screen.getByTestId('badge-verified')).toHaveTextContent('موثّق')
    expect(screen.getByText('الأعمال')).toBeInTheDocument()
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
