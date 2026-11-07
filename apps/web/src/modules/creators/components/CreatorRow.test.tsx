import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { creatorSummary } from '../../../../tests/fixtures/creators'
import type { CreatorRowView } from '../describe'
import { CreatorRow } from './CreatorRow'

const view: CreatorRowView = {
  name: 'Sara Khan',
  displayCode: 'CR-7K4Q2',
  initials: 'SK',
  types: 'Photographer and videographer',
  place: 'Dubai Marina +1',
  specialties: 'Portrait, Events',
}

describe('CP-US1-S1/S2 creator row', () => {
  it('links to the profile and shows name, code, types and place', () => {
    renderWithLocale(<CreatorRow creator={creatorSummary()} view={view} href="/creators/7k4q2" />)
    const link = screen.getByTestId('creator-card')
    expect(link).toHaveAttribute('href', '/creators/7k4q2')
    expect(link).toHaveAttribute('data-code', '7K4Q2')
    expect(link).toHaveTextContent('Sara Khan')
    expect(link).toHaveTextContent('Photographer and videographer · Dubai Marina +1')
    expect(screen.getByText('CR-7K4Q2').closest('bdi')).toHaveAttribute('dir', 'ltr')
  })

  it('hides specialties in the landing block', () => {
    renderWithLocale(<CreatorRow creator={creatorSummary()} view={view} href="/x" />)
    expect(screen.queryByText('Portrait, Events')).not.toBeInTheDocument()
  })

  it('shows specialties as plain text in the directory', () => {
    renderWithLocale(<CreatorRow creator={creatorSummary()} view={view} href="/x" showSpecialties />)
    expect(screen.getByText('Portrait, Events')).toBeInTheDocument()
  })

  it('uses the photo as a decorative tile when there is one', () => {
    renderWithLocale(<CreatorRow creator={creatorSummary()} view={view} href="/x" />)
    const img = screen.getByTestId('creator-card').querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('alt', '')
    expect(screen.queryByText('SK')).not.toBeInTheDocument()
  })

  it('shows the initials when there is no photo (an honest placeholder, never a stock image)', () => {
    renderWithLocale(<CreatorRow creator={creatorSummary({ photo: null })} view={view} href="/x" />)
    expect(screen.getByTestId('creator-card').querySelector('img')).toBeNull()
    expect(screen.getByText('SK')).toHaveAttribute('aria-hidden', 'true')
  })

  it('the Top Hit is the blue row with the same content and a Return hint', () => {
    renderWithLocale(<CreatorRow creator={creatorSummary()} view={view} href="/creators/7k4q2" tone="hit" showSpecialties />)
    const hit = screen.getByTestId('creator-top-hit')
    expect(hit).toHaveAttribute('href', '/creators/7k4q2')
    expect(hit.className).toContain('bg-accent')
    expect(hit).toHaveTextContent('Portrait, Events')
    expect(hit.querySelector('kbd')).not.toBeNull()
  })

  it('omits the second line when the creator lists neither type nor place', () => {
    renderWithLocale(<CreatorRow creator={creatorSummary()} view={{ ...view, types: '', place: '' }} href="/x" />)
    expect(screen.getByTestId('creator-card')).not.toHaveTextContent('·')
  })

  it('renders an Arabic creator right to left with the code kept left to right', () => {
    renderWithLocale(
      <CreatorRow creator={creatorSummary()} view={{ ...view, name: 'سارة خان', types: 'مصوّر', place: 'دبي مارينا' }} href="/ar/creators/7k4q2" />,
      { locale: 'ar' },
    )
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
    expect(screen.getByTestId('creator-card')).toHaveTextContent('سارة خان')
    expect(screen.getByText('CR-7K4Q2').closest('bdi')).toHaveAttribute('dir', 'ltr')
  })
})
