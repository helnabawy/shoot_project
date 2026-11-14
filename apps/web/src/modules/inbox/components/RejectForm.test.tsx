import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { BriefCard } from './BriefCard'
import { item, reasons } from './fixtures'

vi.mock('../actions', () => ({ answerBriefAction: vi.fn(), withdrawBriefAction: vi.fn() }))

describe('BI-US3-S2 "Not for me" asks for an optional reason and note', () => {
  it('reasons from the content list, none required, a short note, and the brief to answer', () => {
    renderWithLocale(<BriefCard item={item()} locale="en" primary reasons={reasons} />)
    const form = screen.getByTestId('inbox-reject-form')
    const radios = within(form).getAllByRole('radio')
    expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual(['not-free', 'too-far'])
    expect(radios.every((r) => !(r as HTMLInputElement).required)).toBe(true)
    expect(within(form).getByLabelText('A note for our team (optional)')).toHaveAttribute('maxLength', '300')
    expect((form.querySelector('input[name="decision"]') as HTMLInputElement).value).toBe('reject')
    expect((form.querySelector('input[name="ref"]') as HTMLInputElement).value).toBe('B-7K2QX')
    expect(within(form).getByText('The client is not told. You can undo this while the brief is open.')).toBeInTheDocument()
  })

  it('in Arabic the labels are Arabic', () => {
    renderWithLocale(<BriefCard item={item()} locale="ar" primary={false} reasons={reasons} />, { locale: 'ar' })
    expect(screen.getAllByText('ليس لي').length).toBeGreaterThan(0)
    expect(screen.getByTestId('inbox-accept')).toHaveTextContent('أستطيع القيام بذلك')
  })
})
