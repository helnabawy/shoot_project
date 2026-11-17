import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { item, reasons } from './fixtures'
import { InboxList } from './InboxList'

vi.mock('../actions', () => ({ answerBriefAction: vi.fn(), withdrawBriefAction: vi.fn() }))

const offers = {
  budgetFils: 80000,
  range: { minFils: 56000, maxFils: 160000 },
  offerFils: null,
  revisionsLeft: 3,
  declined: false,
  place: { area: 'Yas Island', emirate: 'Abu Dhabi', mapUrl: 'https://maps.example.test/static.png', distanceKm: 22 },
}

function show(over: Parameters<typeof item>[0] = {}, section: 'open' | 'accepted' = 'open') {
  const card = item({ ...offers, ...over } as never)
  renderWithLocale(<InboxList locale="en" inbox={{ open: section === 'open' ? [card] : [], accepted: section === 'accepted' ? [card] : [], rejected: [], reasons }} />)
}

describe('OF-US2 the creator sees the client price on the inbox card', () => {
  it('OF-US2-S1 shows the client price, the area and distance, never the pin, and "Accept {price}" first', () => {
    show()
    const card = screen.getByTestId('inbox-brief')
    expect(within(card).getByTestId('inbox-client-price')).toHaveTextContent('AED 800')
    const place = within(card).getByTestId('inbox-place')
    expect(place).toHaveTextContent('Yas Island, Abu Dhabi')
    expect(place).toHaveTextContent('About 22 km from you')
    expect(within(card).getAllByRole('button')[0]).toHaveTextContent('Accept AED 800')
  })

  it('OF-US2-S1a without a starting point, the card asks the creator to set one', () => {
    show({ place: { ...offers.place, distanceKm: null } } as never)
    expect(screen.getByRole('link', { name: 'Set where you start from' })).toHaveAttribute('href', expect.stringContaining('/account/profile'))
  })

  it('a fixed-price brief shows no price row', () => {
    renderWithLocale(<InboxList locale="en" inbox={{ open: [item()], accepted: [], rejected: [], reasons }} />)
    expect(screen.queryByTestId('inbox-client-price')).toBeNull()
    expect(screen.queryByTestId('inbox-offer')).toBeNull()
  })
})

describe('OF-US3 the creator offers another price', () => {
  it('OF-US3-S2 OF-US3-S3 the offer form is a whole-AED field limited to the range, pre-filled with the client price', () => {
    show()
    const form = screen.getByTestId('inbox-offer-form')
    const field = within(form).getByLabelText('Your price')
    expect(field).toHaveValue(800)
    expect(field).toHaveAttribute('min', '560')
    expect(field).toHaveAttribute('max', '1600')
    expect(within(form).getByText(/3 more times/)).toBeInTheDocument()
  })

  it('OF-US3-S4 an offer sent can be changed, starting from the amount offered', () => {
    show({ answer: 'accepted', offerFils: 95000, revisionsLeft: 2 } as never, 'accepted')
    const change = screen.getByTestId('inbox-offer-change')
    expect(within(change).getByLabelText('Your price')).toHaveValue(950)
    expect(within(change).getByText(/2 more times/)).toBeInTheDocument()
  })
})

describe('OF-SC-002 two taps from the push', () => {
  it('the brief the push opened comes first, with its Accept as the primary action', () => {
    const first = item({ ref: 'B-AAAAA', ...offers } as never)
    const pushed = item({ ref: 'B-PUSH1', ...offers, budgetFils: 120000 } as never)
    renderWithLocale(<InboxList locale="en" focus={{ ref: 'B-PUSH1', persona: '1' }} inbox={{ open: [first, pushed], accepted: [], rejected: [], reasons }} />)
    const cards = screen.getAllByTestId('inbox-brief')
    expect(cards[0]).toHaveAttribute('data-ref', 'B-PUSH1')
    expect(within(cards[0]!).getByTestId('inbox-accept')).toHaveTextContent('Accept AED 1,200')
  })
})

describe('OF-FR-025 Arabic place rows', () => {
  it('the distance and the price keep Western digits and the area reads right to left', () => {
    renderWithLocale(<InboxList locale="ar" inbox={{ open: [item({ ...offers, place: { ...offers.place, area: 'جزيرة ياس', emirate: 'أبوظبي' } } as never)], accepted: [], rejected: [], reasons }} />, { locale: 'ar' })
    const place = screen.getByTestId('inbox-place')
    expect(place).toHaveTextContent('جزيرة ياس، أبوظبي')
    expect(place.textContent).toMatch(/22/)
    expect(screen.getByTestId('inbox-client-price').textContent).toMatch(/800/)
    expect(place.textContent).not.toMatch(/[٠-٩]/)
  })
})

