import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { ContactRows, type ContactView } from './ContactRows'
import { QuotationView, type QuotationViewProps } from './QuotationView'

const sara: ContactView = { name: 'Sara Khan', role: 'Photographer', phone: '+971521112233', display: '+971 52 111 2233', telHref: 'tel:+971521112233', whatsappHref: 'https://wa.me/971521112233?text=Hi%20Sara' }

const quotation = (over: Partial<QuotationViewProps> = {}): QuotationViewProps => ({
  reference: 'Q-5AHF6',
  version: 1,
  issued: '18 Nov, 21:18',
  validUntil: '25 Nov, 21:18',
  replacedBy: null,
  sentence: 'I need a photographer for a portrait session.',
  creators: [{ type: 'Photographer', name: 'Sara Khan' }],
  lines: [{ kind: 'tier', label: 'Photographer', amount: 'AED 800', deliverables: [] }],
  total: 'AED 800',
  status: <p>Paid.</p>,
  whatsappHref: 'https://wa.me/971500000000',
  ...over,
})

describe('025 contact on the quotation', () => {
  it('BC-US1-S1 each booked creator is a group with Call (the number, left-to-right) and Message on WhatsApp', () => {
    renderWithLocale(<QuotationView {...quotation({ contacts: [sara] })} />)
    expect(screen.getByRole('group', { name: 'Contact Sara Khan · Photographer' })).toBeInTheDocument()
    const call = screen.getByTestId('contact-call')
    expect(call).toHaveAttribute('href', 'tel:+971521112233')
    expect(call.querySelector('bdi')).toHaveAttribute('dir', 'ltr')
    expect(call.querySelector('bdi')).toHaveTextContent('+971 52 111 2233')
    const chat = screen.getByTestId('contact-whatsapp')
    expect(chat).toHaveAttribute('href', sara.whatsappHref)
    expect(chat).toHaveAttribute('rel', 'noopener noreferrer')
    expect(chat).toHaveTextContent('Message on WhatsApp')
  })

  it('BC-US1-S1 in Arabic the words are Arabic and the number stays left-to-right', () => {
    renderWithLocale(<ContactRows contact={sara} side="creator" />, { locale: 'ar' })
    expect(screen.getByTestId('contact-call')).toHaveTextContent('اتصال')
    expect(screen.getByTestId('contact-call').querySelector('bdi')).toHaveAttribute('dir', 'ltr')
    expect(screen.getByTestId('contact-whatsapp')).toHaveTextContent('رسالة على واتساب')
  })

  it('BC-US2-S3 no contact (no verified number, or not the two sides): the quotation shows no contact group', () => {
    renderWithLocale(<QuotationView {...quotation()} />)
    expect(screen.queryByTestId('booking-contact')).toBeNull()
    expect(screen.getByText('Questions? Ask on WhatsApp')).toBeInTheDocument()
  })

  it('BC-US2-S3 a client without a name is "your client"', () => {
    renderWithLocale(<ContactRows contact={{ ...sara, name: '', role: '' }} side="client" />)
    expect(screen.getByTestId('contact-call')).toHaveAccessibleName('Call: Contact your client')
  })
})
