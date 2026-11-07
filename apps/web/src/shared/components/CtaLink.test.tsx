import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithLocale } from '../../../tests/setup/render'
import { CtaLink, resolveCta } from './CtaLink'


const contact = { whatsappNumber: '+971500000000', whatsappMessage: 'Hi', phoneNumber: '+97141234567' }

describe('CMS calls to action', () => {
  it('resolves each kind or nothing', () => {
    expect(resolveCta({ label: 'Chat', kind: 'whatsapp' }, contact)?.href).toBe('https://wa.me/971500000000?text=Hi')
    expect(resolveCta({ label: 'Call', kind: 'call' }, contact)?.href).toBe('tel:+97141234567')
    expect(resolveCta({ label: 'Join', kind: 'link', href: '/register' }, contact)).toEqual({ href: '/register', external: false, internal: true })
    expect(resolveCta({ label: 'Docs', kind: 'link', href: 'https://x.ae' }, contact)?.external).toBe(true)
    expect(resolveCta({ label: '', kind: 'link', href: '/x' }, contact)).toBeNull()
    expect(resolveCta({ label: 'Call', kind: 'call' }, {})).toBeNull()
    expect(resolveCta({ label: 'Chat', kind: 'whatsapp' }, {})).toBeNull()
    expect(resolveCta({ label: 'Go', kind: 'link' }, contact)).toBeNull()
    expect(resolveCta(null, contact)).toBeNull()
  })

  it('primary renders the Top Hit; secondary renders a row; internal links stay in the app', () => {
    renderWithLocale(
      <>
        <CtaLink cta={{ label: 'Start a brief', kind: 'link', href: '#brief' }} contact={contact} />
        <CtaLink cta={{ label: 'Join', kind: 'link', href: '/register' }} contact={contact} locale="ar" variant="secondary" />
        <CtaLink cta={{ label: 'WhatsApp us', kind: 'whatsapp' }} contact={contact} variant="secondary" />
        <CtaLink cta={{ label: 'Hidden', kind: 'call' }} contact={{}} />
      </>,
    )
    expect(screen.getByRole('link', { name: /Start a brief/ })).toHaveAttribute('href', '#brief')
    expect(screen.getByRole('link', { name: /Join/ })).toHaveAttribute('href', '/ar/register')
    expect(screen.getByRole('link', { name: /WhatsApp us/ })).toHaveAttribute('target', '_blank')
    expect(screen.queryByText('Hidden')).toBeNull()
  })
})
