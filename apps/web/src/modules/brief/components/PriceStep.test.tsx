import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'

const previewPrices = vi.fn()
vi.mock('@/modules/booking/preview-action', () => ({ previewMatches: async () => null, previewPrices: (...a: unknown[]) => previewPrices(...a) }))

const { PriceStep } = await import('./PriceStep')

const labels = {
  label: 'Your price for the {type}',
  range: 'Usual price {price}. You can offer {min} to {max}.',
  rangeOpen: 'Any price from {min}.',
  total: 'If a {type} accepts your price',
  totalHint: 'Includes the {percent}% service fee',
  lower: 'Lower',
  raise: 'Raise',
  loading: 'Working out the price…',
  currency: 'AED',
}
const answers = { values: { persona: 'photographer', occasion: 'event', duration: '2h' }, custom: {} }
const photographer = { persona: 'photographer', label: 'Photographer', suggestedFils: 80000, minFils: 56000, maxFils: 160000 }

async function show(errors: Record<string, string> = {}) {
  renderWithLocale(<PriceStep locale="en" answers={answers} labels={labels} feePercent={10} errors={errors} />)
  await act(async () => {})
}

describe('OF-US1 the price step', () => {
  it('OF-US1-S1 shows the usual price, the range and the total with the fee', async () => {
    previewPrices.mockResolvedValue({ prices: [photographer] })
    await show()
    const field = screen.getByLabelText('Your price for the Photographer')
    expect(field).toHaveValue('800')
    expect(field).toHaveAttribute('name', 'budget.photographer')
    expect(field).toHaveAttribute('inputmode', 'numeric')
    expect(screen.getByText(/Usual price 800\. You can offer 560 to 1,600\./)).toBeInTheDocument()
    expect(screen.getByTestId('price-total-photographer')).toHaveTextContent('AED 880')
  })

  it('OF-US1-S3 the steppers stay within the range', async () => {
    previewPrices.mockResolvedValue({ prices: [photographer] })
    await show()
    const field = screen.getByLabelText('Your price for the Photographer')
    fireEvent.change(field, { target: { value: '570' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lower' }))
    expect(field).toHaveValue('560')
    fireEvent.change(field, { target: { value: '1590' } })
    fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
    expect(field).toHaveValue('1600')
  })

  it('OF-US1-S6 a price the server refused is shown on its field', async () => {
    previewPrices.mockResolvedValue({ prices: [photographer] })
    await show({ 'budget.photographer': 'Choose a price from AED 560 to AED 1,600.' })
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a price from AED 560')
    expect(screen.getByLabelText('Your price for the Photographer')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows nothing when the server has no price step', async () => {
    previewPrices.mockResolvedValue(null)
    await show()
    expect(screen.queryByTestId('price-step')).toBeNull()
  })
})
