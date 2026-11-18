import { act, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { BookingStatus, type BookingStatusProps } from './BookingStatus'

vi.mock('../actions', () => ({
  acceptQuotation: vi.fn(),
  cancelByClient: vi.fn(),
  confirmDelivery: vi.fn(),
  pickAnotherCreator: vi.fn(),
  reportProblem: vi.fn(),
  requestFreshQuotation: vi.fn(),
}))
vi.mock('@/modules/payments/actions', () => ({ payOnline: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@payloadcms/richtext-lexical/react', () => ({ RichText: () => <p>Bank transfer instructions</p> }))

const confirmed = (payment: BookingStatusProps['payment'], over: Partial<BookingStatusProps> = {}): BookingStatusProps => ({
  state: 'confirmed',
  access: { ref: 'Q-AAKMJ', key: 'k', locale: 'en' },
  sentence: 'Confirmed. Please pay AED 1,550 and send us the receipt.',
  canAccept: false,
  canCancel: true,
  payment,
  replacements: [],
  history: [],
  ...over,
})
const online = { online: true, total: 'AED 1,550', instructions: null, receiptHref: 'https://wa.me/1?text=r' }

describe('020 paying a confirmed booking on the quotation page', () => {
  it('PY-US1-S1 online: one Pay action with the total and a secure line; no receipt flow', () => {
    renderWithLocale(<BookingStatus {...confirmed(online)} />)
    const pay = screen.getByTestId('quote-pay')
    expect(pay).toHaveTextContent('Pay AED 1,550')
    expect(pay.closest('form')).not.toBeNull()
    expect(screen.getByText(/card, Apple Pay or Google Pay/)).toBeInTheDocument()
    expect(screen.queryByTestId('quote-receipt')).toBeNull()
    expect(screen.queryByText('Bank transfer instructions')).toBeNull()
  })

  it('PY-US1-S4 back from the payment page before the confirmation: being confirmed, no Pay', () => {
    renderWithLocale(<BookingStatus {...confirmed(online, { paymentReturn: 'done' })} />)
    expect(screen.getByTestId('quote-payment-pending')).toHaveAttribute('role', 'status')
    expect(screen.getByTestId('quote-payment-pending')).toHaveTextContent(/confirming/i)
    expect(screen.queryByTestId('quote-pay')).toBeNull()
  })

  it('PY-US1-S4 when no confirmation arrives within the polling minute, the page stops promising seconds', () => {
    vi.useFakeTimers()
    try {
      renderWithLocale(<BookingStatus {...confirmed(online, { paymentReturn: 'done' })} />)
      expect(screen.getByTestId('quote-payment-pending')).toHaveTextContent(/few seconds/i)
      act(() => {
        vi.advanceTimersByTime(60_000)
      })
      const late = screen.getByTestId('quote-payment-pending')
      expect(late).toHaveAttribute('data-late', 'true')
      expect(late).not.toHaveTextContent(/few seconds/i)
      expect(late).toHaveTextContent(/longer than usual/i)
      expect(screen.queryByTestId('quote-pay')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('PY-US1-S5 back after leaving the payment page: nothing charged, Pay again', () => {
    renderWithLocale(<BookingStatus {...confirmed(online, { paymentReturn: 'cancelled' })} />)
    expect(screen.getByText(/Nothing was charged/)).toBeInTheDocument()
    expect(screen.getByTestId('quote-pay')).toBeInTheDocument()
  })

  it('PY-US3-S1 switched off: the instructions and the receipt on WhatsApp, as before', () => {
    renderWithLocale(<BookingStatus {...confirmed({ online: false, total: 'AED 1,550', instructions: {} as never, receiptHref: 'https://wa.me/1?text=r' })} />)
    expect(screen.getByTestId('quote-receipt')).toHaveAttribute('href', 'https://wa.me/1?text=r')
    expect(screen.getByText('Bank transfer instructions')).toBeInTheDocument()
    expect(screen.queryByTestId('quote-pay')).toBeNull()
  })

  it('in Arabic the Pay action reads in Arabic', () => {
    renderWithLocale(<BookingStatus {...confirmed({ ...online, total: '١٬٥٥٠ د.إ.' })} />, { locale: 'ar' })
    expect(screen.getByTestId('quote-pay')).toHaveTextContent('١٬٥٥٠ د.إ.')
    expect(screen.getByTestId('quote-pay')).not.toHaveTextContent('Pay')
  })
})

describe('021 amendment: accepting asks a guest to sign in', () => {
  const quoted = (over: Partial<BookingStatusProps> = {}) => confirmed(null, { state: 'quoted', canAccept: true, canCancel: true, sentence: 'Your quotation is ready.', ...over })

  it('BS-US7-S1 a guest sees one line under Accept saying a code comes next', () => {
    renderWithLocale(<BookingStatus {...quoted({ guest: true })} />)
    const accept = screen.getByTestId('quote-accept')
    expect(accept).toHaveTextContent('Accept quotation')
    expect(screen.getByTestId('quote-sign-in-next')).toHaveTextContent("Next, we'll send a code to your mobile number to log you in.")
  })

  it('BS-US7-S1 a member sees no line, and nothing shows once the quotation cannot be accepted', () => {
    renderWithLocale(<BookingStatus {...quoted({ guest: false })} />)
    expect(screen.getByTestId('quote-accept')).toBeInTheDocument()
    expect(screen.queryByTestId('quote-sign-in-next')).toBeNull()
  })

  it('BS-US7-S1 a guest on a quotation that cannot be accepted sees no line', () => {
    renderWithLocale(<BookingStatus {...quoted({ guest: true, canAccept: false, state: 'accepted' })} />)
    expect(screen.queryByTestId('quote-sign-in-next')).toBeNull()
  })
})
