import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { MatchResults, type MatchResultsProps } from './MatchResults'
import type { PickRowView } from './types'

const row = (over: Partial<PickRowView> = {}): PickRowView => ({ id: '1', code: 'D2222', displayCode: 'CR-D2222', name: 'Sara Khan', initials: 'SK', photo: null, meta: 'Portrait, Events', href: '/match/B-22222/k/details?pick=photographer%3AD2222', chosen: false, ...over })
const props = (over: Partial<MatchResultsProps> = {}): MatchResultsProps => ({
  sentence: 'I need a photographer for an event on Thu 10 Dec for 2 hours in Dubai, shot by anyone.',
  editHref: '/',
  dateLabel: 'Thu 10 Dec',
  sections: [{ personaId: '1', plural: 'Photographers', singular: 'Photographer', price: 'AED 800', deliverables: ['60 edited photos'], creators: [row(), row({ id: '2', code: 'D3333', displayCode: 'CR-D3333', name: 'Omar Ali', initials: 'OA' })], anyHref: '/any', anyChosen: false }],
  nearby: [],
  whatsappHref: 'https://wa.me/971500000000',
  continueHref: null,
  priceOnRequest: false,
  ...over,
})

describe('QM-US1 step 2 results', () => {
  it('QM-US1-S4 one group per type with the one price in its label, then the free creators', () => {
    renderWithLocale(<MatchResults {...props()} />)
    const group = screen.getByRole('group', { name: /Photographers free on Thu 10 Dec · AED 800, VAT included/ })
    expect(within(group).getByText('60 edited photos')).toBeInTheDocument()
    const rows = within(group).getAllByTestId('match-creator')
    expect(rows.map((r) => r.getAttribute('data-code'))).toEqual(['D2222', 'D3333'])
    expect(rows[0]).toHaveAttribute('href', expect.stringContaining('/details?pick='))
    expect(within(rows[0]!).getByText('CR-D2222').closest('bdi')).toHaveAttribute('dir', 'ltr')
    expect(within(group).getByTestId('match-any')).toHaveTextContent('Let us choose for you')
  })

  it('QM-US1-S2 nobody free: an honest row, nearby dates and WhatsApp', () => {
    renderWithLocale(<MatchResults {...props({ sections: [{ ...props().sections[0]!, creators: [] }], nearby: [{ label: 'Fri 11 Dec', href: '/m?date=2026-12-11' }] })} />)
    expect(screen.getByTestId('match-none')).toHaveTextContent('No one is free on Thu 10 Dec')
    expect(screen.getByTestId('match-nearby')).toHaveTextContent('Free on Fri 11 Dec')
    expect(screen.getAllByRole('link', { name: /Ask on WhatsApp/ })[0]).toHaveAttribute('href', 'https://wa.me/971500000000')
  })

  it('QM-US1-S4 price on request: no "let us choose", WhatsApp is the one action', () => {
    renderWithLocale(<MatchResults {...props({ priceOnRequest: true, sections: [{ ...props().sections[0]!, price: null }] })} />)
    expect(screen.getByText("We'll price this one on WhatsApp")).toBeInTheDocument()
    expect(screen.queryByTestId('match-any')).toBeNull()
    expect(screen.getByRole('link', { name: /Ask on WhatsApp/ })).toHaveAttribute('target', '_blank')
  })

  it('a chosen creator is marked, and Continue appears once every type is chosen', () => {
    renderWithLocale(<MatchResults {...props({ continueHref: '/details', sections: [{ ...props().sections[0]!, creators: [row({ chosen: true })] }] })} />)
    expect(screen.getByTestId('match-creator')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByTestId('match-creator')).toHaveTextContent('Chosen')
    expect(screen.getByTestId('match-continue')).toHaveAttribute('href', '/details')
  })

  it('renders in Arabic with the price isolated left-to-right', () => {
    renderWithLocale(<MatchResults {...props({ dateLabel: 'الخميس 10 ديسمبر' })} />, { locale: 'ar' })
    expect(screen.getByRole('group', { name: /المصوّرون|Photographers/ })).toBeInTheDocument()
    expect(screen.getByText('دعنا نختار لك')).toBeInTheDocument()
  })
})
