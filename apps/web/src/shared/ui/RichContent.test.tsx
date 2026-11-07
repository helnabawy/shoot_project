import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../tests/setup/render'
import { RichContent, safeHref } from './RichContent'

const text = (t: string) => ({ type: 'text', text: t, version: 1, format: 0, detail: 0, mode: 'normal', style: '' })
const el = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({ type, version: 1, children, direction: 'ltr', format: '', indent: 0, ...extra })
const link = (url: string, label: string, newTab = false) => el('link', [text(label)], { fields: { linkType: 'custom', url, newTab } })
const doc = (...children: unknown[]) => ({ root: el('root', children) }) as never

describe('MP-FR-015 RichContent', () => {
  it('renders headings, paragraphs, lists and quotes', () => {
    renderWithLocale(
      <RichContent
        data={doc(
          el('heading', [text('Heading')], { tag: 'h2' }),
          el('paragraph', [text('Body text')]),
          el('list', [el('listitem', [text('one')], { value: 1 })], { listType: 'bullet', tag: 'ul', start: 1 }),
          el('quote', [text('Quoted')]),
        )}
      />,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Heading' })).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(screen.getByText('Quoted')).toBeInTheDocument()
  })

  it('opens external links safely, keeps site links in the reader’s language and neutralises unsafe ones', () => {
    renderWithLocale(
      <RichContent
        locale="ar"
        data={doc(
          el('paragraph', [link('https://example.com', 'outside'), link('/guides', 'inside'), link('javascript:alert(1)', 'evil'), link('//evil.example', 'protocol-relative')]),
        )}
      />,
      { locale: 'ar' },
    )
    const outside = screen.getByRole('link', { name: 'outside' })
    expect(outside).toHaveAttribute('href', 'https://example.com')
    expect(outside).toHaveAttribute('target', '_blank')
    expect(outside).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'inside' })).toHaveAttribute('href', '/ar/guides')
    expect(screen.getByRole('link', { name: 'inside' })).not.toHaveAttribute('target')
    expect(screen.getByRole('link', { name: 'evil' })).toHaveAttribute('href', '#')
    expect(screen.getByRole('link', { name: 'protocol-relative' })).toHaveAttribute('href', '#')
  })

  it('renders an uploaded image with its alt text and treats a missing alt as decorative', () => {
    const upload = (alt: string | null) => el('upload', [], { relationTo: 'media', value: { url: '/media/a.jpg', alt, width: 10, height: 5 }, fields: null })
    const { container } = renderWithLocale(<RichContent data={doc(upload('A studio'), upload(null), el('upload', [], { relationTo: 'media', value: 7, fields: null }))} />)
    expect(screen.getByRole('img', { name: 'A studio' })).toHaveAttribute('src', '/media/a.jpg')
    expect(container.querySelectorAll('img')).toHaveLength(2)
    expect(container.querySelectorAll('img[alt=""]')).toHaveLength(1)
  })

  it('renders markup-looking text as text and autolinks safely', () => {
    const { container } = renderWithLocale(
      <RichContent data={doc(el('paragraph', [text('<script>alert(1)</script>'), el('autolink', [text('site')], { fields: { linkType: 'custom', url: 'https://x.ae' } })]))} />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'site' })).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('accepts a custom class', () => {
    const { container } = renderWithLocale(<RichContent className="custom" data={doc()} />)
    expect(container.querySelector('.custom')).not.toBeNull()
  })
})

describe('safeHref', () => {
  it('only produces site, web, mail and phone links', () => {
    expect(safeHref('/x')).toBe('/x')
    expect(safeHref('/x', 'en')).toBe('/x')
    expect(safeHref('https://a.b')).toBe('https://a.b')
    expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c')
    expect(safeHref('tel:+971')).toBe('tel:+971')
    expect(safeHref('data:text/html,x')).toBe('#')
    expect(safeHref(undefined)).toBe('#')
    expect(safeHref(' /y ', 'ar')).toBe('/ar/y')
  })
})
