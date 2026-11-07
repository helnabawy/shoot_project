import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { BookingStatus, CancelBooking, type BookingStatusProps } from './BookingStatus'
import { QuotationView, type QuotationViewProps } from './QuotationView'

vi.mock('../actions', () => ({
  acceptQuotation: vi.fn(),
  cancelByClient: vi.fn(),
  confirmDelivery: vi.fn(),
  pickAnotherCreator: vi.fn(),
  reportProblem: vi.fn(),
  requestFreshQuotation: vi.fn(),
}))
vi.mock('@payloadcms/richtext-lexical/react', () => ({ RichText: () => <p>Rich text</p> }))

const status = (over: Partial<BookingStatusProps> = {}): BookingStatusProps => ({
  state: 'quoted',
  access: { ref: 'Q-22222', key: 'k', locale: 'en' },
  sentence: 'Valid until 17 Nov. Accept it to ask your professional to confirm.',
  canAccept: true,
  canCancel: true,
  payment: null,
  replacements: [],
  history: [],
  ...over,
})
const view = (over: Partial<QuotationViewProps> = {}): QuotationViewProps => ({
  reference: 'Q-22222',
  version: 1,
  issued: '10 Nov, 10:00',
  validUntil: '17 Nov, 10:00',
  replacedBy: null,
  sentence: 'I need a photographer for an event.',
  creators: [{ type: 'Photographer', name: 'Sara Khan' }, { type: 'Videographer', name: null }],
  lines: [
    { kind: 'tier', label: '2-hour photo shoot', amount: 'AED 800', deliverables: ['60 edited photos'] },
    { kind: 'discount', label: 'Code WELCOME20', amount: '-AED 160', deliverables: [] },
  ],
  total: 'AED 640',
  terms: null,
  status: <BookingStatus {...status()} />,
  whatsappHref: 'https://wa.me/971500000000',
  ...over,
})

describe('QM-US2-S1 the quotation document', () => {
  it('shows reference, dates, creators, lines and the total with one primary action', () => {
    renderWithLocale(<QuotationView {...view()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Quotation Q-22222' })).toBeInTheDocument()
    expect(screen.getByText(/Valid until 17 Nov, 10:00/)).toBeInTheDocument()
    expect(screen.getByText('Sara Khan')).toBeInTheDocument()
    expect(screen.getByText("We'll choose")).toBeInTheDocument()
    const lines = screen.getByTestId('quote-lines')
    expect(within(lines).getByText('60 edited photos')).toBeInTheDocument()
    expect(within(lines).getByText('Code WELCOME20')).toBeInTheDocument()
    expect(screen.getByTestId('quote-total')).toHaveTextContent('AED 640')
    expect(screen.getByTestId('quote-accept')).toHaveTextContent('Accept quotation')
    expect(screen.getByTestId('quote-print')).toHaveTextContent('Download PDF')
  })

  it('a replaced version links to the current one and offers no acceptance', () => {
    renderWithLocale(<QuotationView {...view({ replacedBy: { reference: 'Q-33333', href: '/q/Q-33333/k' }, status: <BookingStatus {...status({ canAccept: false })} /> })} />)
    expect(screen.getByTestId('quote-replaced')).toHaveTextContent('Replaced by Q-33333')
    expect(screen.queryByTestId('quote-accept')).toBeNull()
  })

  it('QM-US3-S1 confirmed: payment instructions and the receipt on WhatsApp', () => {
    renderWithLocale(<BookingStatus {...status({ state: 'confirmed', canAccept: false, payment: { instructions: null, receiptHref: 'https://wa.me/1?text=r' } })} />)
    expect(screen.getByTestId('quote-receipt')).toHaveAttribute('href', 'https://wa.me/1?text=r')
    expect(screen.getByTestId('booking-status')).toHaveAttribute('data-state', 'confirmed')
  })

  it('QM-US3-S4 delivered: confirm delivery, or report a problem', () => {
    renderWithLocale(<BookingStatus {...status({ state: 'delivered', canAccept: false, canCancel: false })} />)
    expect(screen.getByTestId('quote-confirm-delivery')).toBeInTheDocument()
    expect(screen.getByLabelText('What went wrong?')).toBeRequired()
    expect(screen.queryByTestId('quote-cancel')).toBeNull()
  })

  it('cancelling is a plain row after the document, never next to the primary action', () => {
    renderWithLocale(<QuotationView {...view({ endActions: <CancelBooking access={status().access} label="Cancel this booking" /> })} />)
    const cancel = screen.getByTestId('quote-cancel')
    expect(cancel).toHaveTextContent('Cancel this booking')
    expect(screen.getByTestId('booking-status')).not.toContainElement(cancel)
  })

  it('expired: get a fresh quotation; history lists only real events', () => {
    renderWithLocale(<BookingStatus {...status({ state: 'expired', canAccept: false, canCancel: false, history: [{ label: 'Expired', at: '18 Nov, 10:00' }] })} />)
    expect(screen.getByTestId('quote-fresh')).toHaveTextContent('Get a fresh quotation')
    expect(screen.getByText('18 Nov, 10:00')).toBeInTheDocument()
  })

  it('QM-US3-S2 a lapsed type offers other creators at the same price', () => {
    renderWithLocale(
      <BookingStatus
        {...status({
          state: 'accepted',
          canAccept: false,
          replacements: [{ personaId: '1', type: 'Photographer', sentence: 'Photographer: your professional could not confirm.', creators: [{ id: '2', code: 'D3333', displayCode: 'CR-D3333', name: 'Omar Ali', initials: 'OA', photo: null, meta: '', href: '#', chosen: false }] }],
        })}
      />,
    )
    const button = screen.getByRole('button', { name: /Omar Ali/ })
    expect(button).toHaveAttribute('type', 'submit')
  })
})
