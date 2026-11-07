import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import type { MatchPreview as Preview } from '@/modules/booking/preview-action'

const previewMatches = vi.fn<(input: unknown) => Promise<Preview | null>>()
vi.mock('@/modules/booking/preview-action', () => ({ previewMatches: (input: unknown) => previewMatches(input) }))
const { MatchPreview } = await import('./MatchPreview')

const labels = { group: '{types} free for this · {price}', groupNoPrice: '{types} free for this', loading: "Finding who's free…", none: 'No one is free for this yet.', more: '+{count} more on the next step' }
const answers = { values: { persona: 'photographer' }, custom: {} }
const creator = (code: string, name: string) => ({ pick: `photographer:${code}`, code, displayCode: `CR-${code}`, name, initials: name.slice(0, 2), photo: null, meta: 'Wedding & engagement · 7 years' })

describe('QM-US1-S7 matches in the bar', () => {
  it('shows a quiet loading line, then the free creators under the one price; each row submits its pick', async () => {
    previewMatches.mockResolvedValueOnce({ sections: [{ persona: 'photographer', plural: 'Photographers', price: 'AED 600', total: 5, creators: [creator('DB3M8', 'Fatima Al Zaabi'), creator('D7777', 'Maya Khoury')] }] })
    renderWithLocale(<MatchPreview locale="en" answers={answers} labels={labels} pending={false} />)
    expect(screen.getByTestId('match-preview-loading')).toHaveTextContent("Finding who's free…")
    expect(await screen.findByRole('group', { name: /Photographers free for this · AED 600/ })).toBeInTheDocument()
    const rows = screen.getAllByTestId('match-preview-creator')
    expect(rows.map((r) => [r.getAttribute('type'), r.getAttribute('name'), r.getAttribute('value')])).toEqual([
      ['submit', 'pick', 'photographer:DB3M8'],
      ['submit', 'pick', 'photographer:D7777'],
    ])
    expect(rows[0]).toHaveTextContent('Wedding & engagement · 7 years')
    expect(screen.getByText('+3 more on the next step')).toBeInTheDocument()
    expect(previewMatches).toHaveBeenCalledWith({ locale: 'en', ...answers })
  })

  it('says plainly when nobody is free, and renders nothing while the brief is incomplete', async () => {
    previewMatches.mockResolvedValueOnce({ sections: [{ persona: 'photographer', plural: 'Photographers', price: null, total: 0, creators: [] }] })
    const { rerender } = renderWithLocale(<MatchPreview locale="en" answers={answers} labels={labels} pending={false} />)
    expect(await screen.findByText('No one is free for this yet.')).toBeInTheDocument()
    rerender(<MatchPreview locale="en" answers={null} labels={labels} pending={false} />)
    expect(screen.queryByTestId('match-preview')).toBeNull()
  })

  it('renders nothing when Quick Match is off (no preview)', async () => {
    previewMatches.mockResolvedValueOnce(null)
    renderWithLocale(<MatchPreview locale="en" answers={{ values: { persona: 'x' }, custom: {} }} labels={labels} pending={false} />)
    await vi.waitFor(() => expect(screen.queryByTestId('match-preview-loading')).toBeNull())
    expect(screen.queryByTestId('match-preview')).toBeNull()
  })
})
