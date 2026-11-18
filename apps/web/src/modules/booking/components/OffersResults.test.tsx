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
  creatorPath: (code: string, _locale: string, back?: string) => `/creators/${code.toLowerCase()}${back ? `?back=${encodeURIComponent(back)}` : ''}`,
  describeCreator: (c: { name: string; code: string }) => ({ name: c.name, initials: 'XX', displayCode: `CR-${c.code}`, place: 'Dubai' }),
}))

const { OffersResults } = await import('./OffersResults')

const creator = (code: string, name: string) => ({ id: Number(code), code, name, photo: null })
const offer = (code: string, name: string, amountFils: number, atYourPrice: boolean) => ({ creator: creator(code, name), amountFils, feeFils: amountFils / 10, totalFils: Math.round(amountFils * 1.1), atYourPrice })
const section = (slug: string, singular: string, offers: ReturnType<typeof offer>[], waiting: ReturnType<typeof creator>[] = []) => ({ persona: { id: slug === 'photographer' ? 1 : 2, slug, singular, plural: `${singular}s` }, budgetFils: 80000, offers, waiting })
const page = (sections: ReturnType<typeof section>[], sentTo = 7) =>
  ({ mode: 'offers', sentTo, stamp: 's1', brief: { sentence: 'A photographer for a birthday in Abu Dhabi', selections: [{ token: 'location', label: 'Abu Dhabi' }] }, sections }) as never

async function show(p: unknown, picks: { persona: string; code: string | null }[] = [], changed?: string) {
  const ui = await OffersResults({ page: p as never, refKey: { ref: 'B-22222', key: 'k' }, locale: 'en', picks, editHref: '/', whatsappHref: 'https://wa.me/1', changed })
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Dubai">
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('OF-US4 the client sees the offers', () => {
  it('OF-US4-S1 OF-US2-S2 waiting: says how many creators the brief went to, not limited to the emirate', async () => {
    await show(page([section('photographer', 'Photographer', [])]))
    // The test stand-in for next-intl leaves the plural unformatted; the filled-in parts are checked.
    expect(screen.getByTestId('offers-waiting')).toHaveTextContent(/photographers\. They see the area/)
    expect(screen.getByTestId('offers-waiting')).not.toHaveTextContent(/Abu Dhabi/)
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

  it('OF-US4-S7 an offer that moved while the client chose shows a notice with the new amount', async () => {
    await show(page([section('photographer', 'Photographer', [offer('0421', 'Mariam S.', 95000, false)])]), [], '0421')
    expect(screen.getByTestId('offer-changed')).toHaveTextContent('Mariam changed the price')
    expect(screen.getByText('AED 1,045')).toBeInTheDocument()
  })

  it('OF-US4-S10 the creators who have not answered are not listed, even if the server sends them', async () => {
    await show(page([section('photographer', 'Photographer', [], [creator('0087', 'Omar K.'), creator('0421', 'Mariam S.')])]))
    expect(screen.getByTestId('offers-waiting')).toBeInTheDocument()
    expect(screen.queryByTestId('offers-asked-photographer')).toBeNull()
    expect(screen.queryAllByTestId('offers-asked')).toHaveLength(0)
    expect(screen.queryByText('Omar K.')).toBeNull()
    expect(screen.queryByText('Asked')).toBeNull()
  })

})

describe('OF-US4-S11 the client can open the profile of each creator who offered', () => {
  it('the photo, name and code link to the profile, with the way back to these offers and picks', async () => {
    await show(page([section('photographer', 'Photographer', [offer('0087', 'Omar K.', 80000, true), offer('0421', 'Mariam S.', 95000, false)])]), [{ persona: 'photographer', code: '0087' }])
    const links = screen.getAllByTestId('offer-profile')
    expect(links).toHaveLength(2)
    const back = encodeURIComponent('/match/B-22222/k?pick=photographer%3A0087')
    expect(links[1]).toHaveAttribute('href', `/creators/0421?back=${back}`)
    expect(within(links[1]!).getByText('Mariam S.')).toBeInTheDocument()
    expect(within(links[1]!).getByText('CR-0421')).toBeInTheDocument()
    expect(links[1]).toHaveAccessibleName(/Mariam S\..*profile/)
    // Accept and Decline stay outside the link: one primary action, unchanged.
    expect(within(links[0]!).queryByTestId('offer-accept')).toBeNull()
    expect(screen.getAllByTestId('offer-accept')).toHaveLength(2)
  })

  it('without picks the way back is the bare offers page', async () => {
    await show(page([section('photographer', 'Photographer', [offer('0087', 'Omar K.', 80000, true)])]))
    expect(screen.getByTestId('offer-profile')).toHaveAttribute('href', `/creators/0087?back=${encodeURIComponent('/match/B-22222/k')}`)
  })
})
