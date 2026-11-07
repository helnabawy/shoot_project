import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Bidi } from './Bidi'

describe('US6-S7 bidi isolation', () => {
  it('wraps content in a left-to-right bdi', () => {
    render(
      <p dir="rtl">
        رقمنا <Bidi>+971 58 149 8824</Bidi>
      </p>,
    )
    const bdi = screen.getByText('+971 58 149 8824')
    expect(bdi.tagName).toBe('BDI')
    expect(bdi).toHaveAttribute('dir', 'ltr')
  })
})
