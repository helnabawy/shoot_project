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
    expect(screen.getByText('Math')).toBeInTheDocument()
    expect(screen.getByText('Math').closest('a')).toBeNull()
    expect(screen.getByTestId('category-plain')).toHaveTextContent('Math')
  })

  it('renders nothing when there are no categories', () => {
    const { container } = render({ audienceCategories: [] })
    expect(within(container).queryByRole('list')).toBeNull()
  })
})
