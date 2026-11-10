import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { CategoriesGridBlock, Category } from '@/payload-types'
import { renderWithLocale } from '../../../../../tests/setup/render'
import { CategoriesGrid } from './CategoriesGrid'

const audience = [
  { id: '1', slug: 'portrait', name: 'Portrait', order: 1, active: true, personas: ['1'], glyph: 'P' },
  { id: '2', slug: 'events', name: 'Events', order: 2, active: true, personas: ['1'], glyph: 'E' },
  { id: '3', slug: 'wedding', name: 'Wedding', order: 3, active: true, personas: ['1'], glyph: 'W' },
]
const block = (over: Partial<CategoriesGridBlock> = {}): CategoriesGridBlock => ({ blockType: 'categoriesGrid', id: 'c', anchor: 'specialties', heading: 'Specialties', source: 'active', ...over })
const render = (over: Partial<Parameters<typeof CategoriesGrid>[0]> = {}, locale: 'en' | 'ar' = 'en') =>
  renderWithLocale(<CategoriesGrid block={block()} audienceCategories={audience} contact={{}} locale={locale} {...over} />, { locale })

describe('CP-US4-S2 landing specialties link to their pages', () => {
  it('links each specialty to /work/{slug}, under /ar in Arabic', () => {
    render()
    expect(screen.getAllByTestId('category-link').map((a) => a.getAttribute('href'))).toEqual(['/work/portrait', '/work/events', '/work/wedding'])
    document.body.innerHTML = ''
    render({}, 'ar')
    expect(screen.getAllByTestId('category-link')[0]).toHaveAttribute('href', '/ar/work/portrait')
  })

  it('CP-US4-S1 shows "N samples · M pros" from the real counts, each part only when above zero', () => {
    render({ counts: { '1': { samples: 428, pros: 43 }, '2': { samples: 0, pros: 2 }, '3': { samples: 5, pros: 0 } } })
    const [portrait, events, wedding] = screen.getAllByTestId('category-link')
    expect(portrait).toHaveTextContent('428 samples · 43 pros')
    expect(events).toHaveTextContent('2 pros')
    expect(events).not.toHaveTextContent('0 samples')
    expect(wedding).toHaveTextContent('5 samples')
    expect(wedding).not.toHaveTextContent('0 pros')
  })

  it('CP-US4-S1 never invents a number: no counts means no counts line, and one is singular for one', () => {
    render()
    expect(screen.queryByTestId('category-counts')).toBeNull()
    document.body.innerHTML = ''
    render({ counts: { '1': { samples: 1, pros: 1 }, '2': { samples: 0, pros: 0 } } })
    expect(screen.getAllByTestId('category-counts')).toHaveLength(1)
    expect(screen.getByTestId('category-counts')).toHaveTextContent('1 sample · 1 pro')
  })

  it('CP-US4-S1 says counts in Arabic with the right plural form', () => {
    render({ counts: { '1': { samples: 3, pros: 2 } } }, 'ar')
    expect(screen.getByTestId('category-counts')).toHaveTextContent('3 أعمال · محترفان')
  })

  it('a hand-picked category the audience does not offer has no page, so it is plain text, not a dead link', () => {
    const outside = { id: 9, slug: 'math', name: 'Math', glyph: 'M', active: true } as unknown as Category
    render({ block: block({ source: 'manual', categories: [outside, { id: 1, slug: 'portrait', name: 'Portrait', glyph: 'P', active: true } as unknown as Category] }) })
    // Only the one the audience offers links; Math is plain text.
    expect(screen.getAllByTestId('category-link')).toHaveLength(1)
    expect(screen.getByTestId('category-link')).toHaveAttribute('href', '/work/portrait')
    const tiles = screen.getByRole('list')
    expect(within(tiles).getByText('Math')).toBeInTheDocument()
    expect(within(tiles).getByText('Math').closest('a')).toBeNull()
    expect(screen.getByTestId('category-plain')).toHaveTextContent('Math')
  })

  it('shows each specialty as a numbered tile, the section label above its heading (design 05 Landing)', () => {
    render({ block: block({ heading: 'What do you need shot?', subheading: 'Start from the shoot' }) })
    const heading = screen.getByRole('heading', { level: 2, name: 'What do you need shot?' })
    const label = screen.getByText('Start from the shoot')
    // The label reads before the heading.
    expect(label.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const tiles = screen.getAllByTestId('category-link')
    expect(tiles[0]).toHaveTextContent('01')
    expect(tiles[0]).toHaveTextContent('Portrait')
    expect(tiles[2]).toHaveTextContent('03')
  })

  it('draws the scene the CMS picked for a specialty, a plain scene with its glyph when none is picked', () => {
    render({ audienceCategories: [{ ...audience[0]!, scene: 'portrait' }, audience[1]!] })
    const [portrait, events] = screen.getAllByTestId('category-link')
    expect(portrait!.querySelector('[data-scene]')).toHaveAttribute('data-scene', 'portrait')
    expect(events!.querySelector('[data-scene]')).toHaveAttribute('data-scene', 'none')
    expect(events).toHaveTextContent('E')
    // The drawing is decoration; the tile's name is the specialty.
    expect(portrait!.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('uses the specialty image from the CMS in place of the drawing', () => {
    render({ audienceCategories: [{ ...audience[0]!, scene: 'portrait', image: { url: '/api/media/file/p.webp', width: 800, height: 1000, alt: 'A portrait' } }] })
    const tile = screen.getByTestId('category-link')
    expect(tile.querySelector('img')).toHaveAttribute('alt', '')
    expect(tile.querySelector('[data-scene]')).toBeNull()
  })

  it('runs the specialty names past as a decorative ticker, hidden from assistive tech', () => {
    const { container } = render()
    const ticker = container.querySelector('.kinds-ticker')
    expect(ticker).toHaveAttribute('aria-hidden', 'true')
    expect(ticker).toHaveTextContent('Events')
  })

  it('renders nothing when there are no categories', () => {
    const { container } = render({ audienceCategories: [] })
    expect(within(container).queryByRole('list')).toBeNull()
  })
})
