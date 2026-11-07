import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarField, BriefBar, GlyphTile, KeyHint, ResultGroup, ResultRow, rowClass, TopHit } from '.'

describe('Brief Bar kit', () => {
  it('TopHit is a submit button, or a link when given an href', () => {
    const { rerender } = render(<TopHit label="See who's free" testId="hit" pending />)
    const button = screen.getByTestId('hit')
    expect(button.tagName).toBe('BUTTON')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    rerender(<TopHit label="Open WhatsApp" href="https://wa.me/1" external testId="hit" />)
    expect(screen.getByTestId('hit')).toHaveAttribute('target', '_blank')
    expect(screen.getByTestId('hit')).toHaveAttribute('rel', 'noopener noreferrer')
    rerender(<TopHit label="Join" href="/register" testId="hit" />)
    expect(screen.getByTestId('hit')).not.toHaveAttribute('target')
  })

  it('ResultGroup as a fieldset names its radio rows with the legend', () => {
    render(
      <ResultGroup as="fieldset" label="Occasion" message={<p>Pick one</p>}>
        <label>
          <input type="radio" name="o" /> Wedding
        </label>
      </ResultGroup>,
    )
    expect(screen.getByRole('group', { name: 'Occasion' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('ResultGroup as a div is a labelled group too', () => {
    render(<ResultGroup label="Actions">rows</ResultGroup>)
    expect(screen.getByRole('group')).toHaveTextContent('Actions')
  })

  it('ResultRow shows the trailing state, with attention styling', () => {
    render(<ResultRow glyph="W" label="Wedding" trailing="Pick a date" state="attention" />)
    expect(screen.getByText('Pick a date').className).toContain('bg-attention')
    expect(rowClass('set', false)).toContain('font-semibold')
    expect(rowClass('open')).toContain('cursor-pointer')
  })

  it('a selected row is tinted selection blue with a blue tick tile and blue state text', () => {
    render(<ResultRow glyph="✓" label="Videographer" trailing="set" state="set" />)
    expect(rowClass('set')).toContain('bg-selected')
    expect(rowClass('set')).toContain('hover:bg-selected-hover')
    expect(rowClass('open')).not.toContain('bg-selected')
    expect(screen.getByText('set').className).toContain('text-selected-ink')
    expect(screen.getByText('✓').className).toContain('bg-accent')
  })

  it('renders the panel, field, tile and key hint', () => {
    render(
      <BriefBar as="section" size="sm" aria-label="bar">
        <BarField filter={<input aria-label="filter" />}>sentence</BarField>
        <GlyphTile tone="accent">A</GlyphTile>
        <GlyphTile tone="set">B</GlyphTile>
        <KeyHint>Esc</KeyHint>
      </BriefBar>,
    )
    expect(screen.getByRole('region', { name: 'bar' }).className).toContain('bar-panel')
    expect(screen.getByLabelText('filter')).toBeInTheDocument()
    expect(screen.getByText('Esc').tagName).toBe('KBD')
  })

  it('FR-066 renders the glass tone and the field trailing control', () => {
    render(
      <BriefBar tone="glass" aria-label="glass bar" as="section">
        <BarField trailing={<button type="button">toggle</button>}>sentence</BarField>
      </BriefBar>,
    )
    expect(screen.getByRole('region', { name: 'glass bar' }).className).toContain('bar-glass')
    expect(screen.getByRole('button', { name: 'toggle' })).toBeInTheDocument()
  })
})
