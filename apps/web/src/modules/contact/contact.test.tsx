import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FloatingWhatsApp } from './components/FloatingWhatsApp'
import { WhatsAppButton } from './components/WhatsAppButton'
import { whatsappHref } from './whatsapp'

describe('FR-010 / FR-011 WhatsApp actions', () => {
  it('builds the link from the configured number and message', () => {
    expect(whatsappHref('+971 50 000 0000', 'Hi!')).toBe('https://wa.me/971500000000?text=Hi!')
    expect(whatsappHref('0500000000')).toBeNull()
    expect(whatsappHref(null)).toBeNull()
  })

  it('WhatsAppButton opens a new tab with an accessible name', () => {
    render(<WhatsAppButton number="+971500000000" message="Hello" label="WhatsApp us" testId="wa" />)
    const link = screen.getByRole('link', { name: 'WhatsApp us' })
    expect(link).toHaveAttribute('href', 'https://wa.me/971500000000?text=Hello')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders nothing without a valid number', () => {
    const { container } = render(
      <>
        <WhatsAppButton number="" label="x" />
        <FloatingWhatsApp number={undefined} label="x" />
      </>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('FloatingWhatsApp is labelled and positioned at the bottom end', () => {
    render(<FloatingWhatsApp number="+971500000000" label="Chat with us on WhatsApp" />)
    const link = screen.getByRole('link', { name: 'Chat with us on WhatsApp' })
    expect(link.className).toContain('end-4')
    expect(link.className).toContain('md:hidden')
  })

  it('FR-011 the floating button steps aside while the brief panel is on screen', async () => {
    let notify: (entries: { isIntersecting: boolean; target: Element }[]) => void = () => {}
    const original = window.IntersectionObserver
    window.IntersectionObserver = class {
      constructor(cb: typeof notify) {
        notify = cb
      }
      observe() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver
    const panel = document.createElement('div')
    panel.setAttribute('data-floating-hide', '')
    document.body.appendChild(panel)
    const { FloatingWhatsAppLink } = await import('./components/FloatingWhatsAppLink')
    render(<FloatingWhatsAppLink href="https://wa.me/971500000000" label="Chat on WhatsApp" />)
    const link = screen.getByTestId('whatsapp-floating')
    expect(link).not.toHaveAttribute('data-covered')
    act(() => notify([{ isIntersecting: true, target: panel }]))
    expect(link).toHaveAttribute('data-covered', 'true')
    expect(link).toHaveAttribute('tabindex', '-1')
    act(() => notify([{ isIntersecting: false, target: panel }]))
    expect(link).not.toHaveAttribute('data-covered')
    window.IntersectionObserver = original
    panel.remove()
  })
})
