import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next-intl/server', () => import('../../../../tests/setup/server-intl'))

const { NotFoundView } = await import('./NotFoundView')
const whatsapp = { number: '+971500000001', message: 'Hi' }

describe('MP-US5 NotFoundView', () => {
  it('MP-US5-S1 says it cannot find the page and offers the brief, the guides and WhatsApp', async () => {
    render(await NotFoundView({ variant: 'notFound', locale: 'en', whatsapp, hasGuides: true }))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Page not found')
    const view = screen.getByTestId('not-found')
    expect(view).toHaveAttribute('data-variant', 'notFound')
    expect(within(view).getByRole('link', { name: /Start a brief/ })).toHaveAttribute('href', '/')
    expect(within(view).getByRole('link', { name: /Read the guides/ })).toHaveAttribute('href', '/guides')
    expect(within(view).getByRole('link', { name: /WhatsApp/ }).getAttribute('href')).toContain('wa.me/971500000001')
  })

  it('MP-US5-S2 says the page has been removed, in different words', async () => {
    render(await NotFoundView({ variant: 'removed', locale: 'en', whatsapp, hasGuides: true }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This page has been removed')
    expect(screen.getByTestId('not-found')).toHaveAttribute('data-variant', 'removed')
    expect(screen.queryByText('The page you\'re looking for doesn\'t exist.')).toBeNull()
  })

  it('MP-US5-S1 speaks Arabic with Arabic addresses', async () => {
    render(await NotFoundView({ variant: 'notFound', locale: 'ar', whatsapp, hasGuides: true }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('الصفحة غير موجودة')
    expect(screen.getByRole('link', { name: /ابدأ طلباً/ })).toHaveAttribute('href', '/ar')
    expect(screen.getByRole('link', { name: /اقرأ الأدلة/ })).toHaveAttribute('href', '/ar/guides')
  })

  it('leaves out the guides when there are none and WhatsApp when there is no number, never a dead link', async () => {
    render(await NotFoundView({ variant: 'notFound', locale: 'en', whatsapp: {}, hasGuides: false }))
    expect(screen.queryByRole('link', { name: /guides/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
    expect(screen.getByRole('link', { name: /Start a brief/ })).toBeInTheDocument()
  })
})
