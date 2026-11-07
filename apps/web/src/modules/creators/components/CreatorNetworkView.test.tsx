import Link from 'next/link'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { creatorsAr, creatorsEn } from '../../../../tests/fixtures/creators'
import type { CreatorRowView } from '../describe'
import { CreatorNetworkView } from './CreatorNetworkView'

const item = (c: (typeof creatorsEn)[number]) => ({
  creator: c,
  view: { name: c.displayName, displayCode: `CR-${c.code}`, initials: c.displayName.slice(0, 1), types: 'Photographer', place: 'Dubai', specialties: '' } satisfies CreatorRowView,
  href: `/creators/${c.code.toLowerCase()}`,
})

describe('CP-US1-S1 landing "Our network" block', () => {
  it('shows a heading, the creators as rows linking to their profiles, and the call to action', () => {
    renderWithLocale(
      <CreatorNetworkView anchor="our-network" heading="Our network" subheading="Meet the people behind the shoots." items={creatorsEn.map(item)} cta={<Link href="/creators">See everyone</Link>} />,
    )
    expect(screen.getByRole('heading', { name: 'Our network' })).toBeInTheDocument()
    expect(screen.getByText('Meet the people behind the shoots.')).toBeInTheDocument()
    const list = screen.getByTestId('creator-network')
    const rows = within(list).getAllByTestId('creator-card')
    expect(rows.map((r) => r.getAttribute('href'))).toEqual(['/creators/7k4q2', '/creators/3m8tn', '/creators/9px5h'])
    expect(screen.getByRole('link', { name: 'See everyone' })).toHaveAttribute('href', '/creators')
    expect(screen.getByTestId('section-our-network')).toBeInTheDocument()
  })

  it('renders nothing when no creator is listed (a safe empty state, nothing invented)', () => {
    const { container } = renderWithLocale(<CreatorNetworkView anchor="our-network" heading="Our network" items={[]} cta={<Link href="/creators">See everyone</Link>} />)
    expect(container.querySelector('section')).toBeNull()
    expect(screen.queryByText('Our network')).not.toBeInTheDocument()
  })

  it('renders Arabic content right to left', () => {
    renderWithLocale(<CreatorNetworkView anchor="our-network" heading="شبكتنا" items={creatorsAr.map(item)} />, { locale: 'ar' })
    expect(screen.getByText('سارة خان')).toBeInTheDocument()
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
