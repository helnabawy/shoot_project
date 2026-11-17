import { render, screen, within } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'
import en from '../../../../messages/en.json'

vi.mock('next-intl/server', async () => await import('../../../../tests/setup/server-intl'))
vi.mock('../actions', () => ({ declineOfferAction: vi.fn() }))
vi.mock('../live-actions', () => ({ liveMatchStamp: vi.fn(async () => 's') }))
vi.mock('@/modules/creators/client', () => ({ PhotoTile: () => null }))
vi.mock('@/modules/creators', () => ({
  getDirectoryContext: async () => ({ lookups: {}, prefix: 'CR-' }),
  describeCreator: (c: { name: string; code: string }) => ({ name: c.name, initials: 'XX', displayCode: `CR-${c.code}`, place: 'Dubai' }),
}))

const { OffersResults } = await import('./OffersResults')

const creator = (code: string, name: string) => ({ id: Number(code), code, name, photo: null })
const offer = (code: string, name: string, amountFils: number, atYourPrice: boolean) => ({ creator: creator(code, name), amountFils, feeFils: amountFils / 10, totalFils: Math.round(amountFils * 1.1), atYourPrice })
const section = (slug: string, singular: string, offers: ReturnType<typeof offer>[]) => ({ persona: { id: slug === 'photographer' ? 1 : 2, slug, singular, plural: `${singular}s` }, budgetFils: 80000, offers })
const page = (sections: ReturnType<typeof section>[], sentTo = 7) =>
  ({ mode: 'offers', sentTo, stamp: 's1', brief: { sentence: 'A photographer for a birthday in Abu Dhabi', selections: [{ token: 'location', label: 'Abu Dhabi' }] }, sections }) as never

async function show(p: unknown, picks: { persona: string; code: string | null }[] = []) {
  const ui = await OffersResults({ page: p as never, refKey: { ref: 'B-22222', key: 'k' }, locale: 'en', picks, editHref: '/', whatsappHref: 'https://wa.me/1' })
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Dubai">
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('OF-US4 the client sees the offers', () => {
  it('OF-US4-S1 waiting: says how many creators the brief went to', async () => {
    await show(page([section('photographer', 'Photographer', [])]))
    expect(screen.getByTestId('offers-waiting')).toHaveTextContent('Sent to 7 photographers who cover Abu Dhabi')
  })

  it('OF-US4-S3 OF-US4-S4 each offer shows the amount, the fee and the total, with Accept and Decline; only the first Accept is primary', async () => {
    await show(page([section('photographer', 'Photographer', [offer('0087', 'Omar K.', 80000, true), offer('0421', 'Mariam S.', 95000, false)])]))
    expect(screen.getByText(/Photographer · your price AED.800/)).toBeInTheDocument()
    const cards = screen.getAllByTestId('offer-card')
    expect(cards.map((c) => c.getAttribute('data-code'))).toEqual(['0087', '0421'])
    expect(within(cards[0]!).getByText('Your price')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Their price')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Offer AED 950 + fee AED 95')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('AED 1,045')).toBeInTheDocument()
    const accepts = screen.getAllByTestId('offer-accept')
    expect(accepts[0]).toHaveAttribute('href', expect.stringContaining('/details?pick=photographer%3A0087'))
    expect(accepts[0]).toHaveTextContent('Accept Omar')
    expect(within(cards[1]!).getByTestId('offer-decline')).toHaveTextContent('Decline')
    expect(screen.getByTestId('offers-list')).toHaveAttribute('aria-live', 'polite')
  })

  it('OF-US4-S6 two types: Continue appears once an offer is chosen for each', async () => {
    const two = page([section('photographer', 'Photographer', [offer('0087', 'Omar K.', 80000, true)]), section('videographer', 'Videographer', [offer('0555', 'Lina M.', 120000, false)])])
    await show(two, [{ persona: 'photographer', code: '0087' }])
    expect(screen.queryByTestId('offers-continue')).toBeNull()
    expect(screen.getByText(/Continue opens once/)).toBeInTheDocument()
  })
})
