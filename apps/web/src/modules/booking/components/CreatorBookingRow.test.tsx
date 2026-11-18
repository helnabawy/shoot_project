import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { AvailabilityList } from './AvailabilityList'
import { CreatorBookingRow, type CreatorBookingView } from './CreatorBookingRow'

vi.mock('../actions', () => ({ respondToAssignment: vi.fn(), markDelivered: vi.fn(), toggleBlockedDate: vi.fn() }))

const view = (over: Partial<CreatorBookingView> = {}): CreatorBookingView => ({
  bookingId: 7,
  personaId: '1',
  reference: 'Q-22222',
  state: 'accepted',
  awaitingAnswer: true,
  date: '2026-12-10',
  dateLabel: 'Thu 10 Dec',
  place: 'Dubai',
  sentence: 'I need a photographer for an event.',
  price: 'AED 800',
  clientFirstName: 'Layla',
  respondBy: '11 Nov, 10:00',
  ...over,
})

describe('QM-US3 the creator answers', () => {
  it('pending: date, place, brief, price and first name; Confirm is the one primary action; never a phone', () => {
    const { container } = renderWithLocale(<CreatorBookingRow view={view()} locale="en" />)
    expect(screen.getByText('Thu 10 Dec · Dubai')).toBeInTheDocument()
    expect(screen.getByText(/For Layla/)).toBeInTheDocument()
    expect(screen.getByText('Answer by 11 Nov, 10:00')).toBeInTheDocument()
    expect(screen.getByTestId('creator-confirm')).toHaveTextContent('Confirm')
    expect(screen.getByText('Decline', { selector: 'summary' })).toBeInTheDocument()
    expect(screen.getByLabelText('Reason (optional)')).toHaveAttribute('maxLength', '200')
    expect(container.textContent).not.toMatch(/\+?971/)
  })

  it('only the first actionable request is the blue Top Hit; the next ones are plain rows', () => {
    renderWithLocale(<CreatorBookingRow view={view()} locale="en" primary={false} />)
    expect(screen.getByTestId('creator-confirm').tagName).toBe('BUTTON')
    expect(screen.getByTestId('creator-confirm')).toHaveTextContent('Confirm')
  })

  it('scheduled: Mark delivered', () => {
    renderWithLocale(<CreatorBookingRow view={view({ state: 'scheduled', awaitingAnswer: false })} locale="en" />)
    expect(screen.getByTestId('creator-delivered')).toHaveTextContent('Mark delivered')
    expect(screen.queryByTestId('creator-confirm')).toBeNull()
  })
})

describe('QM-FR-002 availability list', () => {
  it('free and blocked dates toggle; booked dates cannot', () => {
    renderWithLocale(
      <AvailabilityList
        locale="en"
        months={[{ label: 'December 2026', days: [
          { date: '2026-12-10', label: 'Thu 10 Dec', status: 'free' },
          { date: '2026-12-11', label: 'Fri 11 Dec', status: 'blocked' },
          { date: '2026-12-12', label: 'Sat 12 Dec', status: 'booked' },
        ] }]}
      />,
    )
    expect(screen.getByRole('group', { name: 'December 2026' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thu 10 Dec: Block' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fri 11 Dec: Free again' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Sat 12 Dec/ })).toBeNull()
    expect(screen.getByText('Booked')).toBeInTheDocument()
  })
})

describe('025 the booked creator reaches the client', () => {
  const contact = { name: 'Layla', role: '', phone: '+971501234567', display: '+971 50 123 4567', telHref: 'tel:+971501234567', whatsappHref: 'https://wa.me/971501234567?text=Hi' }

  it('BC-US2-S1 a confirmed part of a paid booking shows the number, and Call and WhatsApp side by side', () => {
    renderWithLocale(<CreatorBookingRow view={view({ state: 'paid', awaitingAnswer: false, contact })} locale="en" />)
    expect(screen.getByTestId('contact-call')).toHaveAttribute('href', 'tel:+971501234567')
    expect(screen.getByTestId('creator-client-phone')).toHaveTextContent('+971 50 123 4567')
    expect(screen.getByTestId('contact-call')).toHaveAccessibleName('Call Layla')
    expect(screen.getByTestId('contact-whatsapp')).toHaveAttribute('href', 'https://wa.me/971501234567?text=Hi')
    expect(screen.getByTestId('creator-booking')).toHaveAttribute('id', 'b-Q-22222')
    expect(screen.getByTestId('status-tag')).toHaveAttribute('data-tone', 'settled')
  })

  it('BC-US2-S1 no contact, no rows', () => {
    renderWithLocale(<CreatorBookingRow view={view({ state: 'paid', awaitingAnswer: false, contact: null })} locale="en" />)
    expect(screen.queryByTestId('booking-contact')).toBeNull()
  })
})
