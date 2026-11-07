import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { paginateArticles } from '@shoot/domain/pages'
import { Pagination } from './Pagination'

const labels = { nav: 'Pages of guides', previous: 'Previous', next: 'Next', pageOf: 'Page 2 of 3' }
const hrefFor = (n: number) => (n === 1 ? '/guides' : `/guides?page=${n}`)

describe('MP-US3-S1 Pagination', () => {
  it('links both neighbours with rel prev/next and marks the current page', () => {
    render(<Pagination pagination={paginateArticles(30, 2)} hrefFor={hrefFor} labels={labels} />)
    const nav = screen.getByRole('navigation', { name: 'Pages of guides' })
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/guides')
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('rel', 'prev')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/guides?page=3')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('rel', 'next')
    expect(nav).toHaveTextContent('Page 2 of 3')
    expect(screen.getByText('Page 2 of 3')).toHaveAttribute('aria-current', 'page')
  })

  it('shows only the way forward on the first page and only the way back on the last', () => {
    const { rerender } = render(<Pagination pagination={paginateArticles(30, 1)} hrefFor={hrefFor} labels={labels} />)
    expect(screen.queryByRole('link', { name: 'Previous' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Next' })).toBeInTheDocument()
    rerender(<Pagination pagination={paginateArticles(30, 3)} hrefFor={hrefFor} labels={labels} />)
    expect(screen.queryByRole('link', { name: 'Next' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Previous' })).toBeInTheDocument()
  })

  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination pagination={paginateArticles(5, 1)} hrefFor={hrefFor} labels={labels} />)
    expect(container).toBeEmptyDOMElement()
  })
})
