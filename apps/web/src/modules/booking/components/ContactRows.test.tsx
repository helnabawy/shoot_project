import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { ContactButtons, type ContactView } from './ContactRows'
import { HistoryTimeline } from './HistoryTimeline'
import { QuotationView, type QuotationViewProps } from './QuotationView'
import { StatusTag, tagTone } from './StatusTag'

const sara: ContactView = { creatorId: 4, name: 'Sara Khan', role: 'Photographer', phone: '+971521112233', display: '+971 52 111 2233', telHref: 'tel:+971521112233', whatsappHref: 'https://wa.me/971521112233?text=Hi%20Sara' }

const quotation = (over: Partial<QuotationViewProps> = {}): QuotationViewProps => ({
  reference: 'Q-5AHF6',
  version: 1,
  issued: '18 Nov, 21:18',
  validUntil: '25 Nov, 21:18',
  replacedBy: null,
  sentence: 'I need a photographer for a portrait session.',
  creators: [{ type: 'Photographer', name: 'Sara Khan', photo: null, initials: 'SK' }],
  lines: [{ kind: 'tier', label: 'Photographer', amount: 'AED 800', deliverables: [] }],
  total: 'AED 800',
  status: <p>Paid.</p>,
  whatsappHref: 'https://wa.me/971500000000',
  ...over,
})

describe('025 the creator on the quotation', () => {
  it('BC-US1-S1 the booked creator shows with their avatar, type and number, and Call and WhatsApp side by side', () => {
    renderWithLocale(<QuotationView {...quotation({ creators: [{ type: 'Photographer', name: 'Sara Khan', photo: null, initials: 'SK', contact: sara }] })} />)
    const creator = screen.getByTestId('quote-creator')
    expect(within(creator).getByText('SK')).toBeInTheDocument()
    expect(within(creator).getByText('Sara Khan')).toBeInTheDocument()
    expect(within(creator).getByTestId('quote-creator-phone')).toHaveAttribute('dir', 'ltr')
    expect(within(creator).getByTestId('quote-creator-phone')).toHaveTextContent('+971 52 111 2233')
    const call = within(creator).getByTestId('contact-call')
    expect(call).toHaveAttribute('href', 'tel:+971521112233')
    expect(call).toHaveAccessibleName('Call Sara Khan')
    const chat = within(creator).getByTestId('contact-whatsapp')
    expect(chat).toHaveAttribute('href', sara.whatsappHref)
    expect(chat).toHaveAttribute('rel', 'noopener noreferrer')
    expect(chat).toHaveAccessibleName('WhatsApp Sara Khan')
    // Never a second red row.
    expect(screen.queryByTestId('quote-accept')).toBeNull()
  })

  it('BC-US1-S1 in Arabic the buttons read in Arabic', () => {
    renderWithLocale(<ContactButtons contact={sara} who="سارة" />, { locale: 'ar' })
    expect(screen.getByTestId('contact-call')).toHaveTextContent('اتصال')
    expect(screen.getByTestId('contact-whatsapp')).toHaveTextContent('واتساب')
  })

  it('BC-US2-S3 no contact (not paid, no verified number, not the two sides): the creator without number or buttons', () => {
    renderWithLocale(<QuotationView {...quotation()} />)
    expect(screen.getByTestId('quote-creator')).toHaveTextContent('Sara Khan')
    expect(screen.queryByTestId('booking-contact')).toBeNull()
    expect(screen.queryByTestId('quote-creator-phone')).toBeNull()
    expect(screen.getByText('Questions? Ask on WhatsApp')).toBeInTheDocument()
  })

  it('a type the team still chooses keeps its plain row', () => {
    renderWithLocale(<QuotationView {...quotation({ creators: [{ type: 'Videographer', name: null }] })} />)
    expect(screen.queryByTestId('quote-creator')).toBeNull()
    expect(screen.getByText('Videographer')).toBeInTheDocument()
  })
})

describe('the status tag and the history timeline', () => {
  it('a tag names the state; peach when the next move is the client, ink once settled, stone otherwise', () => {
    expect(['quoted', 'confirmed', 'delivered', 'on-hold'].map((s) => tagTone(s))).toEqual(['attention', 'attention', 'attention', 'attention'])
    expect(['paid', 'scheduled', 'completed'].map((s) => tagTone(s))).toEqual(['settled', 'settled', 'settled'])
    expect(['accepted', 'cancelled', 'expired'].map((s) => tagTone(s))).toEqual(['quiet', 'quiet', 'quiet'])
    // A creator's next move is a request to answer, not a booking the client still has to pay.
    expect(['accepted', 'confirmed', 'paid'].map((s) => tagTone(s, 'creator'))).toEqual(['attention', 'quiet', 'settled'])
    renderWithLocale(<StatusTag state="paid" label="Paid" />)
    expect(screen.getByTestId('status-tag')).toHaveTextContent('Paid')
    expect(screen.getByTestId('status-tag')).toHaveAttribute('data-tone', 'settled')
  })

  it('the timeline lists each event in order with its time; the latest is the current step', () => {
    renderWithLocale(<HistoryTimeline events={[{ label: 'Accepted', at: '18 Nov, 21:18' }, { label: 'Confirmed', at: '18 Nov, 21:18' }, { label: 'Paid', at: '18 Nov, 21:19' }]} />)
    const items = within(screen.getByTestId('history-timeline')).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['Accepted18 Nov, 21:18', 'Confirmed18 Nov, 21:18', 'Paid18 Nov, 21:19'])
    expect(items[2]).toHaveAttribute('aria-current', 'step')
    expect(items[0]).not.toHaveAttribute('aria-current')
  })
})
