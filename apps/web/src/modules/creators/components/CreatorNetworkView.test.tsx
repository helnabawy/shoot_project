import Link from 'next/link'
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { creatorSummary, creatorsAr, creatorsEn } from '../../../../tests/fixtures/creators'
import type { CreatorRowView } from '../describe'
import { CreatorNetworkView } from './CreatorNetworkView'

const item = (c: (typeof creatorsEn)[number]) => ({
  creator: c,
  view: {
    name: c.displayName,
    displayCode: `CR-${c.code}`,
    initials: c.displayName.slice(0, 1),
    types: 'Photographer',
    place: 'Dubai',
    specialties: '',
  } satisfies CreatorRowView,
  href: `/creators/${c.code.toLowerCase()}`,
})

describe('CP-US1-S1 landing "Our network" block', () => {
  it('shows a heading, the creators as rows linking to their profiles, and the call to action', () => {
    renderWithLocale(
      <CreatorNetworkView
        anchor="our-network"
        heading="Our network"
        subheading="Meet the people behind the shoots."
        items={creatorsEn.map(item)}
        cta={<Link href="/creators">See everyone</Link>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Our network' })).toBeInTheDocument()
    expect(screen.getByText('Meet the people behind the shoots.')).toBeInTheDocument()
    const list = screen.getByTestId('creator-network')
    const rows = within(list).getAllByTestId('creator-card')
    expect(rows.map((r) => r.getAttribute('href'))).toEqual([
      '/creators/7k4q2',
      '/creators/3m8tn',
      '/creators/9px5h',
    ])
    expect(screen.getByRole('link', { name: 'See everyone' })).toHaveAttribute('href', '/creators')
    expect(screen.getByTestId('section-our-network')).toBeInTheDocument()
  })

  it('shows each creator as a card with their bio excerpt and a verified mark', () => {
    renderWithLocale(
      <CreatorNetworkView
        anchor="our-network"
        heading="Our network"
        items={creatorsEn.map(item)}
      />,
    )
    const card = within(screen.getByTestId('creator-network')).getAllByTestId('creator-card')[0]!
    expect(card).toHaveTextContent('Sara Khan')
    expect(card).toHaveTextContent('Weddings and portraits across Dubai.')
    expect(within(card).getByRole('img', { name: 'Verified' })).toBeInTheDocument()
  })

  it('with too few creators to loop, holds still: one list, no hidden copies, no pause control', () => {
    const { container } = renderWithLocale(
      <CreatorNetworkView
        anchor="our-network"
        heading="Our network"
        items={creatorsEn.map(item)}
      />,
    )
    expect(container.querySelector('[data-runs="true"]')).toBeNull()
    expect(container.querySelectorAll('[data-testid="creator-card"]')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Pause the moving list' })).not.toBeInTheDocument()
  })

  it('with enough creators runs as a loop whose copies are hidden and inert, and can be paused', () => {
    const many = Array.from({ length: 6 }, (_, i) =>
      creatorSummary({ id: String(i + 1), code: `C${i}`, displayName: `Creator ${i + 1}` }),
    )
    const { container } = renderWithLocale(
      <CreatorNetworkView anchor="our-network" heading="Our network" items={many.map(item)} />,
    )
    expect(container.querySelector('[data-runs="true"]')).not.toBeNull()
    // Assistive tech reads each creator once; the loop's copies are hidden and cannot take focus.
    expect(
      within(screen.getByTestId('creator-network')).getAllByTestId('creator-card'),
    ).toHaveLength(6)
    const copies = container.querySelector('ul[aria-hidden="true"]')!
    expect(copies).toHaveAttribute('inert')
    expect(screen.getAllByRole('link', { name: /Creator 1\b/ })).toHaveLength(1)
    const toggle = screen.getByRole('button', { name: 'Pause the moving list' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelector('[data-paused="true"]')).not.toBeNull()
  })

  it('renders nothing when no creator is listed (a safe empty state, nothing invented)', () => {
    const { container } = renderWithLocale(
      <CreatorNetworkView
        anchor="our-network"
        heading="Our network"
        items={[]}
        cta={<Link href="/creators">See everyone</Link>}
      />,
    )
    expect(container.querySelector('section')).toBeNull()
    expect(screen.queryByText('Our network')).not.toBeInTheDocument()
  })

  it('renders Arabic content right to left', () => {
    renderWithLocale(
      <CreatorNetworkView anchor="our-network" heading="شبكتنا" items={creatorsAr.map(item)} />,
      { locale: 'ar' },
    )
    expect(screen.getByText('سارة خان')).toBeInTheDocument()
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
