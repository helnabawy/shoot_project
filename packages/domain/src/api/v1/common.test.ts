import { describe, expect, it } from 'vitest'
import { blockDepth, externalLinkV1, imageV1, linkV1, localeV1, paginationV1, richTextV1, type BlockV1 } from './common'

const size = (width: number) => ({ url: `https://cdn.example/x-${width}.webp`, width, height: Math.round(width * 0.75) })
const text = (t: string) => ({ type: 'text' as const, text: t, bold: false, italic: false, underline: false, code: false })
const para = (t: string): BlockV1 => ({ type: 'paragraph', children: [text(t)] })

describe('localeV1', () => {
  it('is English or Arabic', () => {
    expect(localeV1.parse('ar')).toBe('ar')
    expect(localeV1.safeParse('fr').success).toBe(false)
  })
})

describe('MR-US3-S5 imageV1', () => {
  it('accepts absolute URLs with ascending, unique sizes', () => {
    expect(imageV1.parse({ alt: '', width: 1600, height: 1200, sizes: [size(400), size(800), size(1600)] }).sizes).toHaveLength(3)
  })

  it('refuses a relative URL', () => {
    expect(imageV1.safeParse({ alt: 'a', width: 400, height: 300, sizes: [{ ...size(400), url: '/api/media/file/x.webp' }] }).success).toBe(false)
  })

  it('refuses empty, unsorted or duplicate sizes', () => {
    const base = { alt: 'a', width: 800, height: 600 }
    expect(imageV1.safeParse({ ...base, sizes: [] }).success).toBe(false)
    expect(imageV1.safeParse({ ...base, sizes: [size(800), size(400)] }).success).toBe(false)
    expect(imageV1.safeParse({ ...base, sizes: [size(400), size(400)] }).success).toBe(false)
    expect(imageV1.safeParse({ ...base, width: 0, sizes: [size(400)] }).success).toBe(false)
  })
})

describe('linkV1 and externalLinkV1', () => {
  it('a site path starts with / and carries no language prefix', () => {
    expect(linkV1.parse({ label: 'Guides', path: '/guides' }).path).toBe('/guides')
    expect(linkV1.parse({ label: 'Home', path: '/' }).path).toBe('/')
    expect(linkV1.parse({ label: 'Area', path: '/area' }).path).toBe('/area')
    for (const path of ['/ar/guides', '/ar', '/en/x', 'guides', '//evil', 'https://x.y', '/a b']) {
      expect(linkV1.safeParse({ label: 'x', path }).success, path).toBe(false)
    }
  })

  it('an external link is web, mail or phone', () => {
    expect(externalLinkV1.parse({ label: 'instagram', url: 'https://instagram.com/shoot' }).url).toContain('instagram')
    expect(externalLinkV1.safeParse({ label: 'x', url: 'javascript:alert(1)' }).success).toBe(false)
  })
})

describe('richTextV1', () => {
  it('parses every node kind', () => {
    const doc = {
      nodes: [
        { type: 'paragraph', children: [text('a'), { type: 'lineBreak' }, { type: 'link', href: '/guides/x', children: [text('b')] }] },
        { type: 'heading', level: 2, children: [text('h')] },
        { type: 'list', ordered: true, items: [[para('one')], [para('two'), { type: 'list', ordered: false, items: [[para('nested')]] }]] },
        { type: 'quote', children: [{ ...text('q'), italic: true }] },
        { type: 'image', image: { alt: '', width: 400, height: 300, sizes: [size(400)] } },
      ],
    }
    expect(richTextV1.parse(doc).nodes).toHaveLength(5)
    expect(richTextV1.parse({ nodes: [] }).nodes).toEqual([])
  })

  it('refuses an unknown node kind, a heading level outside 2–4 and an unsafe href', () => {
    expect(richTextV1.safeParse({ nodes: [{ type: 'table', rows: [] }] }).success).toBe(false)
    expect(richTextV1.safeParse({ nodes: [{ type: 'heading', level: 1, children: [] }] }).success).toBe(false)
    expect(richTextV1.safeParse({ nodes: [{ type: 'paragraph', children: [{ type: 'link', href: 'javascript:x', children: [] }] }] }).success).toBe(false)
    expect(richTextV1.safeParse({ nodes: [{ type: 'paragraph', children: [{ type: 'link', href: '/ar/x', children: [] }] }] }).success).toBe(false)
  })

  it('refuses depth 9 and accepts depth 8', () => {
    const nest = (depth: number): BlockV1 => (depth === 1 ? para('leaf') : { type: 'list', ordered: false, items: [[nest(depth - 1)]] })
    expect(blockDepth(nest(8))).toBe(8)
    expect(blockDepth({ type: 'list', ordered: true, items: [] })).toBe(1)
    expect(richTextV1.safeParse({ nodes: [nest(8)] }).success).toBe(true)
    expect(richTextV1.safeParse({ nodes: [nest(9)] }).success).toBe(false)
  })
})

describe('paginationV1', () => {
  it('keeps the page between 1 and the last page', () => {
    expect(paginationV1.parse({ page: 1, pageCount: 0, total: 0, pageSize: 24 }).page).toBe(1)
    expect(paginationV1.parse({ page: 3, pageCount: 3, total: 70, pageSize: 24 }).page).toBe(3)
    expect(paginationV1.safeParse({ page: 4, pageCount: 3, total: 70, pageSize: 24 }).success).toBe(false)
    expect(paginationV1.safeParse({ page: 0, pageCount: 3, total: 70, pageSize: 24 }).success).toBe(false)
    expect(paginationV1.safeParse({ page: 2, pageCount: 0, total: 0, pageSize: 24 }).success).toBe(false)
  })
})
