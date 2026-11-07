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
  pick: 'photographer:any',
  locale: 'en',
  needsDate: false,
  minDate: '2026-11-07',
  defaults: {},
  summary: [{ label: 'I need a photographer…' }, { label: "Photographer: we'll choose" }],
  changeHref: '/match/B-22222/k',
  addOns: [{ id: '1', title: 'Express delivery', price: 'AED 200' }],
  total: 'AED 800',
  errorText: {},
  ...over,
})

describe('QM-US2-S1 step 3 details', () => {
  it('asks only name and WhatsApp, with extras, a code disclosure and one primary action', () => {
    renderWithLocale(<DetailsForm {...props()} />)
    expect(screen.getByLabelText('Your name')).toBeRequired()
    expect(screen.getByLabelText('WhatsApp number')).toHaveAttribute('type', 'tel')
    expect(screen.getByLabelText('WhatsApp number')).toHaveAttribute('dir', 'ltr')
    expect(screen.queryByLabelText('Shoot date')).toBeNull()
    expect(screen.getByRole('checkbox', { name: /Express delivery/ })).toHaveAttribute('value', '1')
    expect(screen.getByText('Have a code?').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Total AED 800')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Ask on WhatsApp' })).toHaveAttribute('target', '_blank')
    expect(screen.getByTestId('details-submit')).toHaveTextContent('Get my quotation')
    expect(screen.getByRole('link', { name: 'Change' })).toHaveAttribute('href', '/match/B-22222/k')
  })

  it('QM-US1-S3 asks for the date when the brief had none; a nearby date travels hidden', () => {
    const { container, unmount } = renderWithLocale(<DetailsForm {...props({ needsDate: true })} />)
    expect(screen.getByLabelText('Shoot date')).toHaveAttribute('min', '2026-11-07')
    unmount()
    const again = renderWithLocale(<DetailsForm {...props({ presetDate: '2026-12-11' })} />)
    expect(again.container.querySelector('input[type=hidden][name=date]')).toHaveValue('2026-12-11')
    expect(container).toBeTruthy()
  })

  it('QM-US2-S6 pre-fills a member', () => {
    renderWithLocale(<DetailsForm {...props({ defaults: { name: 'Layla', whatsapp: '+971501234567' } })} />)
    expect(screen.getByLabelText('Your name')).toHaveValue('Layla')
    expect(screen.getByLabelText('WhatsApp number')).toHaveValue('+971501234567')
  })
})
