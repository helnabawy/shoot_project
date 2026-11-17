import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { DetailsForm, type DetailsFormProps } from './DetailsForm'

vi.mock('../actions', () => ({ requestQuotation: vi.fn(async () => ({ status: 'idle' })) }))

const labels = { title: 'Your details', step: 'Step 3 of 3', summary: 'Your choice', name: 'Your name', whatsapp: 'WhatsApp number', whatsappHint: 'We send your quotation here.', date: 'Shoot date', dateHint: 'Choose one now.', extras: 'Extras', codeToggle: 'Have a code?', code: 'Promo code', submit: 'Get my quotation', change: 'Change', total: 'Total {price}' }
const props = (over: Partial<DetailsFormProps> = {}): DetailsFormProps => ({
  labels,
  whatsapp: { href: 'https://wa.me/971500000000', label: 'Ask on WhatsApp', actions: 'Actions' },
  briefRef: 'B-22222',
  briefKey: 'k',
  pick: 'photographer:0087',
  locale: 'en',
  needsDate: false,
  minDate: '2026-11-07',
  defaults: {},
  summary: [{ label: 'A photographer for a birthday in Abu Dhabi' }, { label: 'Photographer: Omar K.', trailing: 'AED 880' }],
  changeHref: '/match/B-22222/k',
  addOns: [],
  total: 'AED 880',
  errorText: {},
  expect: [{ persona: 'photographer', amountFils: 80000 }],
  noPromo: true,
  fixed: { label: 'Sat 12 Dec · 2 hours · Yas Island, Abu Dhabi', note: 'The creators priced this day, length and place. To change them, send a new brief.', newBriefHref: '/#brief', newBriefLabel: 'Send a new brief' },
  ...over,
})

describe('OF-US5 step 3 in offers mode', () => {
  it('OF-US5-S2 day, length and place are fixed with "send a new brief"; no extras, no promo code; total is offer plus fee', () => {
    renderWithLocale(<DetailsForm {...props()} />)
    expect(screen.getByTestId('details-fixed')).toHaveTextContent('Sat 12 Dec · 2 hours · Yas Island, Abu Dhabi')
    expect(screen.getByRole('link', { name: 'Send a new brief' })).toHaveAttribute('href', '/#brief')
    expect(screen.queryByText('Extras')).toBeNull()
    expect(screen.queryByText('Have a code?')).toBeNull()
    expect(screen.getByText('Total AED 880')).toBeInTheDocument()
  })

  it('OF-US4-S7 the offer amount the client saw is sent, so a moved offer is refused', () => {
    const { container } = renderWithLocale(<DetailsForm {...props()} />)
    expect(container.querySelector('input[name="expect.photographer"]')).toHaveValue('80000')
    expect(screen.getByRole('link', { name: 'Change' })).toHaveAttribute('href', '/match/B-22222/k')
  })
})
