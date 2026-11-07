import Link from 'next/link'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import type { FilterGroupView } from '../directory'
import { DirectoryFilters } from './DirectoryFilters'

const groups: FilterGroupView[] = [
  {
    key: 'type',
    current: null,
    anyHref: '/creators',
    options: [
      { slug: 'photographer', name: 'Photographers', count: 4, selected: false, href: '/creators?type=photographer' },
      { slug: 'videographer', name: 'Videographers', count: 2, selected: false, href: '/creators?type=videographer' },
    ],
  },
  {
    key: 'place',
    current: 'Dubai',
    anyHref: '/creators',
    options: [{ slug: 'dubai', name: 'Dubai', count: 3, selected: true, href: '/creators?place=dubai' }],
  },
  { key: 'specialty', current: null, anyHref: '/creators', options: [] },
]
const props = { groups, tokens: [] as string[], clearHref: null, topHit: <Link href="/creators/7k4q2">Best match</Link>, message: null, briefHref: '/' } as const

describe('CP-US1-S2 directory filters', () => {
  it('shows each filter with its current value and its options with real counts, as plain links', () => {
    renderWithLocale(<DirectoryFilters {...props} />)
    const type = screen.getByTestId('filter-type')
    expect(within(type).getByText('Professional')).toBeInTheDocument()
    // The current value in the row, and the "Any" option under it.
    expect(within(type).getAllByText('Any')).toHaveLength(2)
    const options = within(type).getAllByTestId('filter-option')
    expect(options.map((o) => o.getAttribute('href'))).toEqual(['/creators', '/creators?type=photographer', '/creators?type=videographer'])
    expect(within(options[1]!).getByText('4')).toBeInTheDocument()
    expect(within(options[2]!).getByText('2')).toBeInTheDocument()
  })

  it('marks the chosen option and shows it in the trailing slot; "Any" is chosen only when nothing is', () => {
    renderWithLocale(<DirectoryFilters {...props} />)
    const place = screen.getByTestId('filter-place')
    expect(within(place).getAllByText('Dubai')).toHaveLength(2)
    const options = within(place).getAllByTestId('filter-option')
    expect(options[0]).not.toHaveAttribute('aria-current')
    expect(options[1]).toHaveAttribute('aria-current', 'true')
    const type = within(screen.getByTestId('filter-type')).getAllByTestId('filter-option')
    expect(type[0]!.className).toContain('bg-selected')
  })

  it('does not render a filter that has no options', () => {
    renderWithLocale(<DirectoryFilters {...props} />)
    expect(screen.queryByTestId('filter-specialty')).not.toBeInTheDocument()
  })

  it('prints the chosen filters as tokens in the field', () => {
    renderWithLocale(<DirectoryFilters {...props} tokens={['Videographers', 'Dubai']} />)
    expect(screen.queryByText('All professionals')).not.toBeInTheDocument()
    // The token in the field (the option row of the same name is a link below).
    expect(screen.getAllByText('Videographers').some((el) => el.classList.contains('bg-selected'))).toBe(true)
  })

  it('says all professionals when no filter is set', () => {
    renderWithLocale(<DirectoryFilters {...props} />)
    expect(screen.getByText('All professionals')).toBeInTheDocument()
  })

  it('offers "Clear filters" only when a filter is set', () => {
    renderWithLocale(<DirectoryFilters {...props} clearHref="/creators" />)
    expect(screen.getByTestId('filter-clear')).toHaveAttribute('href', '/creators')
  })

  it('has no "Clear filters" row when nothing is filtered', () => {
    renderWithLocale(<DirectoryFilters {...props} />)
    expect(screen.queryByTestId('filter-clear')).not.toBeInTheDocument()
  })

  it('puts the best match in the Top hit slot', () => {
    renderWithLocale(<DirectoryFilters {...props} />)
    expect(screen.getByText('Top hit')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Best match' })).toBeInTheDocument()
    expect(screen.queryByTestId('directory-empty')).not.toBeInTheDocument()
  })

  it.each([
    ['noMatch', 'No one matches these filters yet.'],
    ['empty', 'No professionals are listed yet.'],
  ] as const)('without a best match (%s) says so and offers to send a brief instead', (message, text) => {
    renderWithLocale(<DirectoryFilters {...props} topHit={null} message={message} briefHref="/ar" />)
    expect(screen.getByTestId('directory-empty')).toHaveTextContent(text)
    expect(screen.getByRole('link', { name: /Send a brief instead/ })).toHaveAttribute('href', '/ar')
  })

  it('is fully Arabic and right to left in Arabic', () => {
    renderWithLocale(<DirectoryFilters {...props} />, { locale: 'ar' })
    expect(screen.getByText('كل المحترفين')).toBeInTheDocument()
    expect(screen.getByText('المحترف')).toBeInTheDocument()
    expect(screen.getByText('أفضل نتيجة')).toBeInTheDocument()
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
