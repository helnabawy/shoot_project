const BLOCKS = new Set(['paragraph', 'heading', 'quote', 'list', 'listitem', 'root'])

function walk(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { type?: unknown; text?: unknown; children?: unknown; root?: unknown }
  if (n.root) return walk(n.root)
  if (typeof n.text === 'string') return n.text
  if (n.type === 'linebreak') return ' '
  const inner = Array.isArray(n.children) ? n.children.map(walk).join('') : ''
  return typeof n.type === 'string' && BLOCKS.has(n.type) ? `${inner} ` : inner
}

/** Plain text of a Lexical editor state (or any node of it): blocks separated by one space. */
export function lexicalToText(node: unknown): string {
  return walk(node).replace(/\s+/g, ' ').trim()
}

/** Number of words in `text`, counted by Unicode word segmentation so Arabic counts correctly. */
export function plainWords(text: string): number {
  let count = 0
  for (const part of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)) {
    if (part.isWordLike) count += 1
  }
  return count
}
