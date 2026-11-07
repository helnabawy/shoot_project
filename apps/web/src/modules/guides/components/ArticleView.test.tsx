import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ArticleDetail } from '../queries'

vi.mock('server-only', () => ({}))
vi.mock('next-intl/server', () => import('../../../../tests/setup/server-intl'))

const { ArticleView } = await import('./ArticleView')
const { GuidesList } = await import('./GuidesList')

const lexical = (text: string) => ({ root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' }] }] } })

const summary = (n: number, extra = {}) => ({
  id: String(n),
  slug: `guide-${n}`,
  title: `Guide ${n}`,
  summary: `Summary ${n}`,
  publishedAt: '2026-10-01T08:00:00.000Z',
  translated: true,
  cover: { url: `/c${n}.webp`, alt: `Cover ${n}`, width: 800, height: 400 },
  author: { slug: 'sara', name: 'Sara Khan' },
  categories: [{ slug: 'weddings', name: 'Weddings' }],
  ...extra,
})
const detail = { ...summary(1), body: lexical('Start with the date.'), readingMinutes: 3, updatedAt: '2026-10-02T08:00:00.000Z', seo: null, ogImage: null } as unknown as ArticleDetail
const contact = { whatsappNumber: '+971500000001', whatsappMessage: 'Hi' }

describe('MP-US3-S3 ArticleView', () => {
  it('shows category, one h1, author link, date, reading time, cover with alt, text and the two ways to go on', async () => {
    render(await ArticleView({ article: detail, related: [summary(2)], locale: 'en', contact, english: false }))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Guide 1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'By Sara Khan' })).toHaveAttribute('href', '/guides/author/sara')
    expect(screen.getAllByText('October 1, 2026')[0]).toHaveAttribute('datetime', '2026-10-01T08:00:00.000Z')
    expect(screen.getByText(/3 min read/)).toBeInTheDocument()
    expect(screen.getAllByAltText('Cover 1')[0]).toHaveAttribute('src', '/c1.webp')
    expect(screen.getByText('Start with the date.')).toBeInTheDocument()
    const next = screen.getByRole('complementary')
    expect(within(next).getByRole('link', { name: /Start a brief/ })).toHaveAttribute('href', '/')
    expect(within(next).getByRole('link', { name: /WhatsApp us/ }).getAttribute('href')).toContain('wa.me/971500000001')
    expect(screen.getByRole('heading', { level: 2, name: 'More guides' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Guide 2' })).toHaveAttribute('href', '/guides/guide-2')
  })

  it('MP-US3-S5 marks a guide shown in English for an Arabic reader and keeps its text left-to-right', async () => {
    render(await ArticleView({ article: { ...detail, translated: false }, related: [], locale: 'ar', contact, english: true }))
    expect(screen.getByText('متاح بالإنجليزية')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('dir', 'ltr')
    expect(screen.queryByRole('heading', { name: 'مزيد من الأدلة' })).toBeNull()
  })
})

describe('MP-US3-S1 GuidesList', () => {
  const pagination = { page: 1, pages: 2, size: 12, offset: 0, hasPrev: false, hasNext: true }
  it('lists the guides under one h1 with the topics, paging and the feed link', async () => {
    render(
      await GuidesList({
        title: 'Guides',
        intro: 'Plain answers.',
        list: { items: [summary(1), summary(2, { translated: false })], pagination, total: 14 },
        categories: [{ slug: 'weddings', name: 'Weddings', description: null, count: 14 }],
        basePath: '/guides',
        locale: 'ar',
      }),
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Guides' })).toBeInTheDocument()
    expect(screen.getAllByTestId('article-card')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Guide 1' })).toHaveAttribute('href', '/ar/guides/guide-1')
    expect(screen.getAllByText('متاح بالإنجليزية')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'التالي' })).toHaveAttribute('href', '/ar/guides?page=2')
    expect(screen.getByRole('navigation', { name: 'المواضيع' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'تابع الأدلة عبر RSS' })).toHaveAttribute('href', '/ar/guides/feed')
  })

  it('says so when there are no guides yet', async () => {
    render(await GuidesList({ title: 'Guides', list: { items: [], pagination: { ...pagination, pages: 1, hasNext: false }, total: 0 }, categories: [], basePath: '/guides', locale: 'en' }))
    expect(screen.getByText('No guides yet.')).toBeInTheDocument()
    expect(screen.queryByTestId('pagination')).toBeNull()
  })
})
