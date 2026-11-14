import { screen } from '@testing-library/react'
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
