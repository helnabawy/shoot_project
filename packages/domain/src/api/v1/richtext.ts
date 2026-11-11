import { linkTarget } from '../../content/links'
import { lexicalToText } from '../../content/richtext'
import { RICH_TEXT_MAX_DEPTH, type BlockV1, type ImageV1, type InlineV1, type RichTextV1, type TextInlineV1 } from './common'

/** A Lexical node as stored by Payload; only the keys the reducer reads. */
interface LexicalNode {
  type?: unknown
  text?: unknown
  format?: unknown
  tag?: unknown
  listType?: unknown
  children?: unknown
  fields?: { url?: unknown } | null
  value?: unknown
  root?: unknown
}

export interface ReduceOptions {
  /** Turns an upload's value (a media document) into an image, or `null` when it has no file. */
  image: (value: unknown) => ImageV1 | null
}

// Lexical's text format bit field.
const BOLD = 1
const ITALIC = 2
const UNDERLINE = 8
const CODE = 16

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'list', 'quote', 'upload'])

const childrenOf = (node: LexicalNode): LexicalNode[] =>
  Array.isArray(node.children) ? (node.children.filter((c) => c && typeof c === 'object') as LexicalNode[]) : []

function textInline(node: LexicalNode): TextInlineV1 {
  const format = typeof node.format === 'number' ? node.format : 0
  return {
    type: 'text',
    text: String(node.text),
    bold: (format & BOLD) !== 0,
    italic: (format & ITALIC) !== 0,
    underline: (format & UNDERLINE) !== 0,
    code: (format & CODE) !== 0,
  }
}

const plain = (text: string): TextInlineV1 => ({ type: 'text', text, bold: false, italic: false, underline: false, code: false })

/** Inline content of a node's children: text, links (or their text when unsafe), line breaks. */
function inlines(nodes: LexicalNode[]): InlineV1[] {
  const out: InlineV1[] = []
  for (const node of nodes) {
    if (typeof node.text === 'string') {
      if (node.text) out.push(textInline(node))
    } else if (node.type === 'linebreak') {
      out.push({ type: 'lineBreak' })
    } else if (node.type === 'link' || node.type === 'autolink') {
      const texts = inlines(childrenOf(node)).filter((i): i is TextInlineV1 => i.type === 'text')
      const href = linkTarget(typeof node.fields?.url === 'string' ? node.fields.url : null)
      if (href) out.push({ type: 'link', href, children: texts })
      else out.push(...texts)
    } else {
      // An unknown inline node keeps its text.
      const text = lexicalToText(node)
      if (text) out.push(plain(text))
    }
  }
  return out
}

const hasText = (children: InlineV1[]) =>
  children.some((c) => (c.type === 'text' ? c.text.trim() !== '' : c.type === 'link' ? c.children.some((t) => t.text.trim() !== '') : false))

const headingLevel = (tag: unknown): 2 | 3 | 4 => {
  const n = typeof tag === 'string' ? Number(tag.replace(/^h/, '')) : 2
  return n <= 2 || Number.isNaN(n) ? 2 : n >= 4 ? 4 : 3
}

/** A paragraph of the node's plain text, or nothing when it has none. */
function flattened(node: LexicalNode): BlockV1[] {
  const text = lexicalToText(node)
  return text ? [{ type: 'paragraph', children: [plain(text)] }] : []
}

/** The blocks of one list item: its inline content as a paragraph, then any nested list. */
function listItem(node: LexicalNode, level: number, options: ReduceOptions): BlockV1[] {
  const blocks: BlockV1[] = []
  let pending: LexicalNode[] = []
  const flush = () => {
    const children = inlines(pending)
    if (hasText(children)) blocks.push({ type: 'paragraph', children })
    pending = []
  }
  for (const child of childrenOf(node)) {
    if (typeof child.type === 'string' && BLOCK_TYPES.has(child.type)) {
      flush()
      blocks.push(...block(child, level, options))
    } else {
      pending.push(child)
    }
  }
  flush()
  return blocks
}

/** One Lexical block at `level` (top level is 1) as zero or more v1 blocks. */
function block(node: LexicalNode, level: number, options: ReduceOptions): BlockV1[] {
  switch (node.type) {
    case 'paragraph':
    case 'quote':
    case 'heading': {
      const children = inlines(childrenOf(node))
      if (!hasText(children)) return []
      if (node.type === 'heading') return [{ type: 'heading', level: headingLevel(node.tag), children }]
      return [{ type: node.type, children }]
    }
    case 'list': {
      // A list's items sit one level deeper; past the cap the whole list becomes plain text.
      if (level >= RICH_TEXT_MAX_DEPTH) return flattened(node)
      const items = childrenOf(node)
        .map((item) => listItem(item, level + 1, options))
        .filter((item) => item.length > 0)
      return items.length ? [{ type: 'list', ordered: node.listType === 'number', items }] : []
    }
    case 'upload': {
      const image = options.image(node.value)
      return image ? [{ type: 'image', image }] : []
    }
    default:
      // An unknown block keeps its text as a paragraph.
      return flattened(node)
  }
}

/**
 * Turns a Lexical editor state into v1 rich text (research R10): paragraphs, headings (h1 → 2,
 * h5–h6 → 4), lists, quotes and images; text with bold, italic, underline and code; links through
 * `linkTarget` (an unsafe link keeps only its text). Empty paragraphs are dropped, unknown nodes keep
 * their text, and nesting stops at `RICH_TEXT_MAX_DEPTH`.
 */
export function reduceRichText(state: unknown, options: ReduceOptions): RichTextV1 {
  if (!state || typeof state !== 'object') return { nodes: [] }
  const root = ((state as LexicalNode).root ?? state) as LexicalNode
  return { nodes: childrenOf(root).flatMap((node) => block(node, 1, options)) }
}
