import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next-intl/server', () => import('../../../../tests/setup/server-intl'))

const { NextUpPanel } = await import('./AccountHome')
const { setRequestLocale } = await import('../../../../tests/setup/server-intl')

const hrefs = { bookings: '/account/bookings', booking: (ref: string) => `/account/bookings/${ref}`, profile: '/account/profile', availability: '/account/availability', brief: '/#brief', inbox: '/account/inbox' }
const brief = { ref: 'BR-7K2Q', profession: 'Photographer', occasion: 'a birthday party', emirate: 'Dubai', date: '2026-11-20', dateLabel: 'Fri 20 Nov' }

describe('BI-US1-S1 Up next leads with open briefs', () => {
  it('shows the soonest brief and one action to the inbox', async () => {
    setRequestLocale('en')
    render(await NextUpPanel({ next: { kind: 'briefs', count: 2, brief }, hrefs }))
    expect(screen.getByText('Fri 20 Nov · Dubai')).toBeInTheDocument()
    expect(screen.getByText('Photographer · a birthday party')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/account/inbox')
    expect(document.body.textContent).not.toMatch(/\+971|@/)
  })

  it('an undated brief says the date is to agree, in Arabic too', async () => {
    setRequestLocale('ar')
    render(await NextUpPanel({ next: { kind: 'briefs', count: 1, brief: { ...brief, date: null, dateLabel: '', emirate: 'دبي' } }, hrefs: { ...hrefs, inbox: '/ar/account/inbox' } }))
    expect(screen.getByText('التاريخ بالاتفاق · دبي')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/ar/account/inbox')
    setRequestLocale('en')
  })
})
