import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FilsCell } from './FilsCell'

describe('FilsCell', () => {
  it.each([
    [80000, '800.00'],
    [170500, '1,705.00'],
    [95000, '950.00'],
    [12345678, '123,456.78'],
  ])('shows %i fils as %s', (fils, shown) => {
    const { container } = render(<FilsCell cellData={fils} />)
    expect(container.textContent).toBe(shown)
  })

  it('shows nothing without a number', () => {
    const { container } = render(<FilsCell cellData={undefined} />)
    expect(container.textContent).toBe('')
  })
})
