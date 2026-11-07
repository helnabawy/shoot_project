import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { SpecialtySamples, type SpecialtySampleItem } from './SpecialtySamples'

const sample = (n: number, over: Partial<SpecialtySampleItem> = {}): SpecialtySampleItem => ({
  id: `s${n}`,
  creatorName: `Creator ${n}`,
  thumb: { url: `/media/${n}.webp`, width: 800, height: 1000 },
  alt: `Alt ${n}`,
  caption: `Caption ${n}`,
  kind: 'image',
  href: `/creators/c${n}`,
  ...over,
})

describe('CP-US4-S1 specialty samples', () => {
  it('shows each sample as a tile that opens its creator\'s profile, named by what it shows and who shot it', () => {
    renderWithLocale(<SpecialtySamples samples={[sample(1), sample(2)]} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Recent work' })).toBeInTheDocument()
    const tiles = screen.getAllByRole('link')
    expect(tiles.map((a) => a.getAttribute('href'))).toEqual(['/creators/c1', '/creators/c2'])
    expect(tiles[0]).toHaveAccessibleName('Caption 1, by Creator 1')
    // The picture is decorative: the link's name carries the meaning.
    expect(tiles[0]!.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('names a tile by its alt text when it has no caption', () => {
    renderWithLocale(<SpecialtySamples samples={[sample(1, { caption: '' })]} />)
    expect(screen.getByRole('link')).toHaveAccessibleName('Alt 1, by Creator 1')
  })

  it('loads every picture lazily (the strip is below the rows), with explicit dimensions', () => {
    renderWithLocale(<SpecialtySamples samples={[sample(1), sample(2), sample(3)]} />)
    const images = screen.getAllByRole('link').map((a) => a.querySelector('img')!)
    expect(images.map((i) => i.getAttribute('loading'))).toEqual(['lazy', 'lazy', 'lazy'])
    expect(images[0]).toHaveAttribute('width', '800')
    expect(images[0]).toHaveAttribute('height', '1000')
  })

  it('renders nothing without samples (no empty grid, no placeholders)', () => {
    const { container } = renderWithLocale(<SpecialtySamples samples={[]} />)
    expect(container.querySelector('[data-testid="specialty-samples"]')).toBeNull()
  })

  it('is Arabic and right to left in Arabic', () => {
    renderWithLocale(<SpecialtySamples samples={[sample(1)]} />, { locale: 'ar' })
    expect(screen.getByRole('heading', { level: 2, name: 'أعمال حديثة' })).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAccessibleName('Caption 1، بعدسة Creator 1')
  })
})
