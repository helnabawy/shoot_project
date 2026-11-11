import { describe, expect, it, vi } from 'vitest'
import { richTextV1, type ImageV1 } from './common'
import { reduceRichText } from './richtext'

const image: ImageV1 = { alt: 'A bride', width: 400, height: 300, sizes: [{ url: 'https://cdn.example/a.webp', width: 400, height: 300 }] }
const options = { image: (value: unknown) => (value && typeof value === 'object' && 'url' in value ? image : null) }

const t = (text: string, format = 0) => ({ type: 'text', text, format, version: 1 })
const p = (...children: unknown[]) => ({ type: 'paragraph', children, version: 1 })
const state = (...children: unknown[]) => ({ root: { type: 'root', children, version: 1 } })
const plain = (text: string) => ({ type: 'text', text, bold: false, italic: false, underline: false, code: false })

function reduce(...children: unknown[]) {
  const out = reduceRichText(state(...children), options)
  richTextV1.parse(out)
  return out.nodes
}

describe('MR-US4-S2 reduceRichText', () => {
  it('keeps paragraphs with bold, italic, underline and code', () => {
    expect(reduce(p(t('plain '), t('bold', 1), t('italic', 2), t('under', 8), t('code', 16), t('both', 3)))).toEqual([
      {
        type: 'paragraph',
        children: [
          plain('plain '),
          { ...plain('bold'), bold: true },
          { ...plain('italic'), italic: true },
          { ...plain('under'), underline: true },
          { ...plain('code'), code: true },
          { ...plain('both'), bold: true, italic: true },
        ],
      },
    ])
  })

  it('clamps headings to levels 2 to 4', () => {
    const h = (tag: string) => ({ type: 'heading', tag, children: [t(tag)] })
    expect(reduce(h('h1'), h('h2'), h('h3'), h('h4'), h('h5'), h('h6'), { type: 'heading', children: [t('none')] }).map((n) => (n.type === 'heading' ? n.level : 0))).toEqual([
      2, 2, 3, 4, 4, 4, 2,
    ])
  })

  it('keeps nested ordered and bullet lists', () => {
    const li = (...children: unknown[]) => ({ type: 'listitem', children })
    const nodes = reduce({
      type: 'list',
      listType: 'number',
      children: [li(t('one')), li(t('two'), { type: 'list', listType: 'bullet', children: [li(t('inner'))] }), li()],
    })
    expect(nodes).toEqual([
      {
        type: 'list',
        ordered: true,
        items: [
          [{ type: 'paragraph', children: [plain('one')] }],
          [
            { type: 'paragraph', children: [plain('two')] },
            { type: 'list', ordered: false, items: [[{ type: 'paragraph', children: [plain('inner')] }]] },
          ],
        ],
      },
    ])
    expect(reduce({ type: 'list', listType: 'bullet', children: [] })).toEqual([])
  })

  it('keeps a quote', () => {
    expect(reduce({ type: 'quote', children: [t('Said', 2)] })).toEqual([{ type: 'quote', children: [{ ...plain('Said'), italic: true }] }])
  })

  it('keeps site and external links, and turns an unsafe link into plain text', () => {
    const link = (url: string, text: string, type = 'link') => ({ type, fields: { url }, children: [t(text)] })
    expect(reduce(p(link('/ar/guides/x', 'site'), link('https://example.com', 'web', 'autolink'), link('javascript:alert(1)', 'bad'), { type: 'link', children: [t('nourl')] }))).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'link', href: '/guides/x', children: [plain('site')] },
          { type: 'link', href: 'https://example.com', children: [plain('web')] },
          plain('bad'),
          plain('nourl'),
        ],
      },
    ])
  })

  it('turns an upload into an image through the callback, and drops one without a file', () => {
    const callback = vi.fn(options.image)
    const out = reduceRichText(state({ type: 'upload', value: { url: '/x.webp' } }, { type: 'upload', value: 7 }), { image: callback })
    expect(out.nodes).toEqual([{ type: 'image', image }])
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('keeps the text of unknown nodes, keeps line breaks and drops empty paragraphs', () => {
    expect(
      reduce(
        p(),
        p(t('   ')),
        p(t('')),
        { type: 'table', children: [{ type: 'tablerow', children: [t('cell')] }] },
        { type: 'horizontalrule' },
        p(t('a'), { type: 'linebreak' }, { type: 'mention', children: [t('@b')] }, { type: 'emoji' }, 'junk'),
      ),
    ).toEqual([
      { type: 'paragraph', children: [plain('cell')] },
      { type: 'paragraph', children: [plain('a'), { type: 'lineBreak' }, plain('@b')] },
    ])
  })

  it('flattens lists past depth 8 into text', () => {
    const nest = (depth: number): unknown =>
      depth === 0 ? t('leaf') : { type: 'list', listType: 'bullet', children: [{ type: 'listitem', children: [nest(depth - 1)] }] }
    const nodes = reduce(nest(12))
    let depth = 1
    let node = nodes[0]
    while (node?.type === 'list') {
      depth += 1
      node = node.items[0]?.[0]
    }
    expect(depth).toBe(8)
    expect(node).toEqual({ type: 'paragraph', children: [plain('leaf')] })
  })

  it('gives no nodes for null, empty or malformed state', () => {
    expect(reduceRichText(null, options)).toEqual({ nodes: [] })
    expect(reduceRichText(undefined, options)).toEqual({ nodes: [] })
    expect(reduceRichText('text', options)).toEqual({ nodes: [] })
    expect(reduceRichText({ root: { type: 'root' } }, options)).toEqual({ nodes: [] })
    expect(reduceRichText({ root: { type: 'root', children: [] } }, options)).toEqual({ nodes: [] })
    expect(reduceRichText({ type: 'root', children: [p(t('bare'))] }, options).nodes).toHaveLength(1)
  })
})
